"use client";

import type { JSX } from "react";
import { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Receipt, UserPlus, XCircle, Edit, Trash2, Loader2, AlertTriangle, Users, BadgePercent, CheckCircle, PercentSquare, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AxiosResponse } from "axios";

import { User } from "@/types/user";
import { Expense, ExpenseShare } from "@/types/expense";

interface ExpensesSectionProps {
  currentUser: User;
  householdMembers: User[];
  onSettlementChange?: () => void;
}

type SplitMode = "AMOUNT" | "PERCENTAGE";

const expenseShareFormSchema = z.object({
  owedById: z.string().uuid("Invalid user ID.").min(1, "Member must be selected."),
  amountOwed: z.number().min(0, "Amount cannot be negative.").optional(),
  percentageOwed: z.number().min(0, "Percentage cannot be negative.").max(100, "Percentage cannot exceed 100.").optional(),
});

const createExpenseFormSchema = z
  .object({
    description: z.string().min(1, "Description is required.").max(100, "Description too long (max 100 chars)."),
    amount: z.number().positive("Total amount must be positive.").max(1000000, "Amount too large."),
    date: z.date({ required_error: "Date is required." }),
    paidById: z.string().uuid({ message: "Payer must be selected." }).min(1, "Payer must be selected."),
    splitMode: z.enum(["AMOUNT", "PERCENTAGE"]),
    shares: z
      .array(expenseShareFormSchema)
      .min(1, "At least one share must be defined."),
  })
  .superRefine((data, ctx) => {
    if (!data.shares || data.shares.length === 0 || data.amount <=0) return;

    if (data.splitMode === "AMOUNT") {
      const totalSharesAmount = data.shares.reduce((sum, share) => sum + (Number(share.amountOwed) || 0), 0);
      if (Math.abs(totalSharesAmount - Number(data.amount)) >= 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sum of share amounts must equal the total expense amount.",
          path: ["shares"],
        });
      }
      data.shares.forEach((share, index) => {
        if (share.amountOwed === undefined || share.amountOwed === null || share.amountOwed < 0.01) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Amount must be at least 0.01.",
                path: [`shares.${index}.amountOwed`],
            });
        }
      });
    } else if (data.splitMode === "PERCENTAGE") {
      const totalPercentage = data.shares.reduce((sum, share) => sum + (Number(share.percentageOwed) || 0), 0);
      if (Math.abs(totalPercentage - 100) >= 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sum of percentages must equal 100%.",
          path: ["shares"],
        });
      }
       data.shares.forEach((share, index) => {
        if (share.percentageOwed === undefined || share.percentageOwed === null || share.percentageOwed <= 0) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Percentage must be greater than 0.",
                path: [`shares.${index}.percentageOwed`],
            });
        }
      });
    }
  });
type CreateExpenseFormValues = z.infer<typeof createExpenseFormSchema>;

export function ExpensesSection({
  currentUser,
  householdMembers,
  onSettlementChange,
}: ExpensesSectionProps): JSX.Element {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [settlingShareId, setSettlingShareId] = useState<string | null>(null);

  const expenseForm = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseFormSchema),
    mode: "onChange",
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      paidById: currentUser?.id || (householdMembers.length > 0 ? householdMembers[0].id : undefined),
      splitMode: "AMOUNT",
      shares: [],
    },
  });

  const {
    control: expenseFormControl,
    handleSubmit: onSubmitExpenseForm,
    reset: resetExpenseForm,
    watch: watchExpenseForm,
    setValue: setExpenseValue,
    trigger: triggerValidation,
    formState: { errors: expenseFormErrors, isDirty, isValid },
  } = expenseForm;

  const {
    fields: shareFields,
    append: appendShare,
    remove: removeShare,
    replace: replaceShares,
  } = useFieldArray({
    control: expenseFormControl,
    name: "shares",
  });

  const watchedAmount = watchExpenseForm("amount");
  const watchedPaidById = watchExpenseForm("paidById");
  const watchedShares = watchExpenseForm("shares");
  const watchedSplitMode = watchExpenseForm("splitMode");

  const fetchExpenses = useCallback(async () => {
    setIsLoadingExpenses(true);
    try {
      const response = await axiosInstance.get("/expenses");
      setExpenses(
        response.data.sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast({ title: "Error Loading Expenses", description: "Could not fetch expenses.", variant: "destructive" });
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser.householdId) {
      fetchExpenses();
    }
  }, [currentUser.householdId, fetchExpenses]);
  
  useEffect(() => {
    if (showExpenseDialog) {
      if (editingExpense) {
        resetExpenseForm({
          description: editingExpense.description,
          amount: Number(editingExpense.amount),
          date: parseISO(editingExpense.date),
          paidById: editingExpense.paidById || undefined,
          splitMode: "AMOUNT",
          shares: editingExpense.shares.map(s => ({ 
            owedById: s.owedById, 
            amountOwed: Number(s.amountOwed),
            percentageOwed: undefined
          })),
        });
      } else {
        const defaultPayer = currentUser?.id || (householdMembers.length > 0 ? householdMembers[0].id : undefined);
        const initialShares = defaultPayer && householdMembers.find(m => m.id === defaultPayer) 
          ? [{ owedById: defaultPayer, amountOwed: 0, percentageOwed: undefined }] 
          : [];
        resetExpenseForm({
          description: "",
          amount: 0,
          date: new Date(),
          paidById: defaultPayer,
          splitMode: "AMOUNT",
          shares: initialShares,
        });
      }
    }
  }, [showExpenseDialog, editingExpense, resetExpenseForm, currentUser, householdMembers]);

  useEffect(() => {
    if (showExpenseDialog && !editingExpense && watchedAmount > 0 && watchedPaidById && watchedShares.length === 0) {
      if (watchedSplitMode === "AMOUNT") {
        replaceShares([{ owedById: watchedPaidById, amountOwed: watchedAmount, percentageOwed: undefined }]);
      } else {
        replaceShares([{ owedById: watchedPaidById, amountOwed: undefined, percentageOwed: 100 }]);
      }
    }
  }, [watchedAmount, watchedPaidById, watchedShares.length, showExpenseDialog, editingExpense, replaceShares, watchedSplitMode]);

  useEffect(() => {
    if (showExpenseDialog) {
      const currentShares = watchedShares;
      const newShares = currentShares.map(share => ({
        ...share,
        amountOwed: watchedSplitMode === "AMOUNT" ? share.amountOwed || 0 : undefined,
        percentageOwed: watchedSplitMode === "PERCENTAGE" ? share.percentageOwed || 0 : undefined,
      }));
      replaceShares(newShares);
      setTimeout(() => triggerValidation("shares"), 0);
    }
  }, [watchedSplitMode, showExpenseDialog]);

  const openNewExpenseDialog = () => {
    setEditingExpense(null);
    setShowExpenseDialog(true);
  };

  const openEditExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseDialog(true);
  };

  const onSubmitExpense: SubmitHandler<CreateExpenseFormValues> = async (values) => {
    setIsSubmittingExpense(true);
    
    let sharesForApi = values.shares.map(s => ({
        owedById: s.owedById,
        amountOwed: 0,
    }));

    if (values.splitMode === "PERCENTAGE") {
        sharesForApi = values.shares.map(s => {
            const percentage = Number(s.percentageOwed) || 0;
            const amountOwed = parseFloat(((percentage / 100) * Number(values.amount)).toFixed(2));
            return {
                owedById: s.owedById,
                amountOwed: amountOwed,
            };
        });
        const totalCalculated = sharesForApi.reduce((sum, s) => sum + s.amountOwed, 0);
        if (sharesForApi.length > 0 && Math.abs(totalCalculated - values.amount) >= 0.01) {
            const difference = values.amount - totalCalculated;
            sharesForApi[sharesForApi.length - 1].amountOwed += difference;
            sharesForApi[sharesForApi.length - 1].amountOwed = parseFloat(sharesForApi[sharesForApi.length - 1].amountOwed.toFixed(2));
        }

    } else {
        sharesForApi = values.shares.map(s => ({
            owedById: s.owedById,
            amountOwed: Number(s.amountOwed) || 0,
        }));
    }
    
    const payloadForApi = {
      description: values.description,
      amount: Number(values.amount),
      date: format(values.date, "yyyy-MM-dd"),
      paidById: values.paidById,
      shares: sharesForApi,
    };

    try {
      let response: AxiosResponse<Expense>;
      if (editingExpense) {
        response = await axiosInstance.patch<Expense>(`/expenses/${editingExpense.id}`, payloadForApi);
        toast({ title: "Expense Updated!", description: `Updated: ${response.data.description}` });
      } else {
        response = await axiosInstance.post<Expense>('/expenses', payloadForApi);
        toast({ title: "Expense Added!", description: `Added: ${response.data.description}` });
      }
      fetchExpenses();
      setShowExpenseDialog(false);
      if (onSettlementChange && !editingExpense) onSettlementChange();
      else if (onSettlementChange && editingExpense) onSettlementChange();
    } catch (error: any) {
      console.error("Expense submission error:", error.response?.data || error.message);
      const msg = error.response?.data?.message || `Error ${editingExpense ? 'updating' : 'creating'} expense.`;
      toast({ title: `${editingExpense ? 'Update' : 'Creation'} Failed`, description: Array.isArray(msg) ? msg.join("; ") : msg, variant: "destructive" });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const onFormErrors = (errors: any) => {
    console.error("Form validation errors:", errors);
    if (errors.shares && errors.shares.message && typeof errors.shares.message === 'string') {
      toast({ title: "Share Error", description: errors.shares.message, variant: "destructive" });
    } else if (Object.keys(errors.shares || {}).length > 0 && errors.shares.root?.message) {
       toast({ title: "Share Error", description: errors.shares.root.message, variant: "destructive" });
    } else {
      toast({ title: "Validation Error", description: "Please check form fields for errors.", variant: "destructive" });
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    setIsDeletingExpense(true);
    try {
      await axiosInstance.delete(`/expenses/${deletingExpenseId}`);
      toast({ title: "Expense Deleted", description: "The expense has been removed." });
      setDeletingExpenseId(null);
      fetchExpenses();
      if (onSettlementChange) onSettlementChange();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Could not delete expense.";
      toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleToggleShareSettlement = async (shareId: string, currentExpense: Expense, settle: boolean) => {
    if (!currentExpense || !currentExpense.paidById) {
      toast({ title: "Error", description: "Cannot determine the payer of the expense.", variant: "destructive"});
      return;
    }
    if (currentUser.id !== currentExpense.paidById) {
      toast({ title: "Not Authorized", description: "Only the payer can change settlement status.", variant: "destructive"});
      return;
    }

    setSettlingShareId(shareId);
    try {
      await axiosInstance.patch(`/expenses/shares/${shareId}/${settle ? 'settle' : 'unsettle'}`);
      toast({ title: `Share ${settle ? 'Settled' : 'Marked Unsettled'}` });
      fetchExpenses();
      if (onSettlementChange) {
        onSettlementChange();
      }
    } catch (error: any) {
      console.error("Error toggling share settlement:", error);
      toast({ title: "Error Updating Share", description: error.response?.data?.message || "Could not update share status.", variant: "destructive" });
    } finally {
      setSettlingShareId(null);
    }
  };

  const handleSplitEqually = () => {
    const numShares = watchedShares.length;
    const totalAmount = Number(watchedAmount);

    if (numShares > 0 && totalAmount > 0) {
      let updatedShares;
      if (watchedSplitMode === "PERCENTAGE") {
        const percentagePerShare = parseFloat((100 / numShares).toFixed(2));
        let remainderPercentage = parseFloat((100 - (percentagePerShare * numShares)).toFixed(2));
        updatedShares = watchedShares.map((share, index) => {
          let currentSharePercentage = percentagePerShare;
          if (remainderPercentage !== 0 && index === 0) {
            currentSharePercentage = parseFloat((currentSharePercentage + remainderPercentage).toFixed(2));
          }
          return { ...share, percentageOwed: currentSharePercentage, amountOwed: undefined };
        });
        toast({ title: "Shares Split Equally by Percentage", description: `Each of ${numShares} members gets ~${percentagePerShare.toFixed(2)}%.` });
      } else {
        const amountPerShare = parseFloat((totalAmount / numShares).toFixed(2));
        let remainder = parseFloat((totalAmount - (amountPerShare * numShares)).toFixed(2));
        updatedShares = watchedShares.map((share, index) => {
          let currentShareAmount = amountPerShare;
          if (remainder !== 0 && index === 0) {
            currentShareAmount = parseFloat((currentShareAmount + remainder).toFixed(2));
          }
          return { ...share, amountOwed: currentShareAmount, percentageOwed: undefined };
        });
        toast({ title: "Shares Split Equally by Amount", description: `Each of ${numShares} members owes approx. ₹${amountPerShare.toFixed(2)}.` });
      }
      replaceShares(updatedShares);
      triggerValidation("shares");
    } else {
      toast({ title: "Cannot Split", description: "Set total amount and add members to shares.", variant: "destructive" });
    }
  };
  
  const calculateRemaining = useCallback(() => {
    if (watchedSplitMode === "PERCENTAGE") {
      const totalPercentage = watchedShares.reduce((sum, share) => sum + (Number(share.percentageOwed) || 0), 0);
      return 100 - totalPercentage;
    } else {
      const totalOwed = watchedShares.reduce((sum, share) => sum + (Number(share.amountOwed) || 0), 0);
      return (Number(watchedAmount) || 0) - totalOwed;
    }
  }, [watchedAmount, watchedShares, watchedSplitMode]);
  
  const remainingToAssign = calculateRemaining();

  const renderExpenseFormFields = () => (
    <div className="space-y-4">
      <FormField control={expenseFormControl} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="E.g., Groceries, Rent" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField control={expenseFormControl} name="amount" render={({ field }) => (<FormItem><FormLabel>Total Amount (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => { field.onChange(parseFloat(e.target.value) || 0); triggerValidation("shares"); }} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={expenseFormControl} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
      </div>
      <FormField control={expenseFormControl} name="paidById" render={({ field }) => (<FormItem><FormLabel>Paid By</FormLabel><Select onValueChange={(value) => { field.onChange(value); triggerValidation("shares"); }} value={field.value} defaultValue={currentUser?.id}><FormControl><SelectTrigger><SelectValue placeholder="Select who paid" /></SelectTrigger></FormControl><SelectContent>{householdMembers?.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
      
      <FormField
        control={expenseFormControl}
        name="splitMode"
        render={({ field }) => (
          <FormItem className="space-y-2">
            <FormLabel>Split Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value: string) => {
                  field.onChange(value as SplitMode);
                }}
                value={field.value}
                className="flex space-x-3"
              >
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><RadioGroupItem value="AMOUNT" /></FormControl>
                  <FormLabel className="font-normal">By Amount (₹)</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl><RadioGroupItem value="PERCENTAGE" /></FormControl>
                  <FormLabel className="font-normal">By Percentage (%)</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <div className="flex justify-between items-center mb-2">
          <FormLabel>Shares ({watchedShares.length})</FormLabel>
          <Button type="button" variant="outline" size="sm" onClick={handleSplitEqually} disabled={isSubmittingExpense || watchedShares.length === 0 || watchedAmount <= 0}>
            {watchedSplitMode === "PERCENTAGE" ? <PercentSquare className="mr-2 h-4 w-4" /> : <BadgePercent className="mr-2 h-4 w-4" />}
            Split Equally
          </Button>
        </div>
        <div className="space-y-3 p-3 border rounded-md bg-muted/20 dark:bg-muted/10 max-h-60 overflow-y-auto">
          {shareFields.map((item, index) => (
            <div key={item.id} className="flex items-start space-x-2 p-2 rounded-md bg-background shadow-sm">
              <FormField 
                control={expenseFormControl} 
                name={`shares.${index}.owedById`} 
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select member" /></SelectTrigger></FormControl>
                      <SelectContent>{householdMembers?.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage className="text-xs"/>
                  </FormItem>
                )} 
              />
              {watchedSplitMode === "AMOUNT" && (
                <FormField 
                  control={expenseFormControl} 
                  name={`shares.${index}.amountOwed`} 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Amount Owed (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="w-28 h-9" /></FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} 
                />
              )}
              {watchedSplitMode === "PERCENTAGE" && (
                <FormField 
                  control={expenseFormControl} 
                  name={`shares.${index}.percentageOwed`} 
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="sr-only">Percentage Owed (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                           <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="w-28 h-9 pr-7" />
                           <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground text-sm">%</span>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs"/>
                    </FormItem>
                  )} 
                />
              )}
              <Button type="button" variant="ghost" size="icon" onClick={() => removeShare(index)} className="shrink-0 text-destructive hover:bg-destructive/10 h-9 w-9 p-0" title="Remove share"><XCircle className="h-5 w-5" /></Button>
            </div>
          ))}
          {shareFields.length === 0 && (<p className="text-sm text-muted-foreground text-center py-2">No shares defined. Add members to split the expense.</p>)}
        </div>
        <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="mt-3 w-full" 
            onClick={() => appendShare({ 
                owedById: householdMembers.length > 0 ? householdMembers[0].id : "", 
                amountOwed: watchedSplitMode === "AMOUNT" ? 0 : undefined, 
                percentageOwed: watchedSplitMode === "PERCENTAGE" ? 0 : undefined 
            })} 
            disabled={isSubmittingExpense}
        >
            <UserPlus className="mr-2 h-4 w-4" /> Add Share Member
        </Button>
        {expenseFormErrors.shares && !Array.isArray(expenseFormErrors.shares) && expenseFormErrors.shares.message && (<p className="text-sm font-medium text-destructive mt-2">{expenseFormErrors.shares.message}</p>)}
        {Array.isArray(expenseFormErrors.shares) && expenseFormErrors.shares.map((shareError, index) => (
            (shareError?.amountOwed || shareError?.owedById || shareError?.percentageOwed) && (
                <div key={index} className="text-sm font-medium text-destructive mt-1">
                    {shareError.owedById && <p>Share {index + 1} member: {shareError.owedById.message}</p>}
                    {shareError.amountOwed && <p>Share {index + 1} amount: {shareError.amountOwed.message}</p>}
                    {shareError.percentageOwed && <p>Share {index + 1} percentage: {shareError.percentageOwed.message}</p>}
                </div>
            )
        ))}
        {watchedAmount > 0 && (
            <div className={cn(
                "mt-2 text-sm font-medium p-2 rounded-md text-center", 
                Math.abs(remainingToAssign) < 0.01 
                    ? "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" 
                    : "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400"
            )}>
                {Math.abs(remainingToAssign) < 0.01 
                    ? (watchedSplitMode === "PERCENTAGE" ? "All percentages assigned (100%)!" : "All amounts assigned!") 
                    : `Remaining to assign: ${remainingToAssign.toFixed(2)}${watchedSplitMode === "PERCENTAGE" ? "%" : "₹"}`
                }
            </div>
        )}
      </div>
    </div>
  );

  if (isLoadingExpenses) {
    return (<Card><CardHeader><CardTitle>Expenses</CardTitle><CardDescription>Shared costs for your household.</CardDescription></CardHeader><CardContent className="flex flex-col items-center justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-primary mb-3" /><p className="text-muted-foreground">Loading expenses...</p></CardContent></Card>);
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div><CardTitle>Expenses ({expenses.length})</CardTitle><CardDescription>Shared costs for your household.</CardDescription></div>
          <Button onClick={openNewExpenseDialog} variant="outline"><Receipt className="mr-2 h-4 w-4" /> Add Expense</Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted rounded-lg text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-xl font-semibold mb-1">No Expenses Yet</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first shared expense.</p>
              <Button onClick={openNewExpenseDialog}><Receipt className="mr-2 h-4 w-4" /> Add First Expense</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <Card key={expense.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="p-4 bg-muted/30 dark:bg-muted/20 flex flex-row items-start justify-between space-y-0">
                    <div><CardTitle className="text-lg">{expense.description}</CardTitle><CardDescription>On {format(parseISO(expense.date), "PPP")}</CardDescription></div>
                    <div className="text-lg font-semibold text-primary">₹{Number(expense.amount).toFixed(2)}</div>
                  </CardHeader>
                  <CardContent className="p-4 text-sm space-y-3">
                    {expense.paidBy ? <p>Paid by: <span className="font-medium">{expense.paidBy.name || expense.paidBy.email}</span></p> : <p className="text-muted-foreground">Payer not specified</p>}
                    <div>
                      <h4 className="font-medium mb-1">Shares:</h4>
                      {expense.shares && expense.shares.length > 0 ? (
                        <ul className="space-y-1 pl-1">
                          {expense.shares.map(share => (
                            <li key={share.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-secondary/30 dark:bg-secondary/20">
                              <span className="flex-grow">
                                <Users className="inline h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                {share.owedBy?.name || share.owedBy?.email || 'Unknown User'}: 
                                <span className="font-semibold ml-1">₹{Number(share.amountOwed).toFixed(2)}</span>
                              </span>
                              <div className="flex items-center space-x-2">
                                <span 
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-semibold", 
                                    share.isSettled ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400"
                                  )}
                                >
                                  {share.isSettled ? "Settled" : "Pending"}
                                </span>
                                {currentUser && expense.paidById === currentUser.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-6 w-6 p-0.5 rounded-full",
                                      share.isSettled ? "text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900" : "text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900",
                                      settlingShareId === share.id && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => handleToggleShareSettlement(share.id, expense, !share.isSettled)}
                                    disabled={settlingShareId === share.id}
                                    title={share.isSettled ? "Mark as Unsettled" : "Mark as Settled"}
                                  >
                                    {settlingShareId === share.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : share.isSettled ? (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    ) : (
                                      <Undo2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground">No shares defined.</p>}
                    </div>
                  </CardContent>
                  <DialogFooter className="p-4 border-t bg-muted/30 dark:bg-muted/20 flex justify-end space-x-2">
                     <Button variant="outline" size="sm" onClick={() => openEditExpenseDialog(expense)}><Edit className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                     <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 border-destructive/50 hover:border-destructive" onClick={() => setDeletingExpenseId(expense.id)} disabled={isDeletingExpense && deletingExpenseId === expense.id}>{isDeletingExpense && deletingExpenseId === expense.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Delete</Button>
                  </DialogFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showExpenseDialog} onOpenChange={(isOpen) => { setShowExpenseDialog(isOpen); if (!isOpen) setEditingExpense(null); }}>
        <DialogContent className="sm:max-w-lg md:max-w-xl">
          <Form {...expenseForm}>
            <form onSubmit={onSubmitExpenseForm(onSubmitExpense, onFormErrors)} className="space-y-0">
              <DialogHeader className="pb-4"><DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle><DialogDescription>{editingExpense ? "Update the details of your shared expense." : "Enter the details of the new shared expense."}</DialogDescription></DialogHeader>
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-2 pl-1 py-2">{renderExpenseFormFields()}</div>
              <DialogFooter className="pt-6">
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => { setShowExpenseDialog(false); setEditingExpense(null); }}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmittingExpense || !isDirty || !isValid}>{isSubmittingExpense ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : (editingExpense ? "Save Changes" : "Add Expense")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingExpenseId} onOpenChange={(isOpen) => { if(!isOpen) setDeletingExpenseId(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the expense{deletingExpenseId && expenses.find(e => e.id === deletingExpenseId) ? ` "${expenses.find(e => e.id === deletingExpenseId)?.description}".` : "."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingExpenseId(null)} disabled={isDeletingExpense}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteExpense} disabled={isDeletingExpense} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground focus-visible:ring-destructive">{isDeletingExpense ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete Expense</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

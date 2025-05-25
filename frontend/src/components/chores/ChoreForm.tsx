"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { CreateChoreData, UpdateChoreData, Chore, ChoreRecurrence } from '@/types/chore';
import { User } from '@/types/user';

const choreFormSchema = z.object({
  description: z.string().min(1, 'Description is required.').max(255),
  notes: z.string().max(1000).optional(),
  dueDate: z.date().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  recurrence: z.nativeEnum(ChoreRecurrence).optional(),
});

type ChoreFormValues = z.infer<typeof choreFormSchema>;

interface ChoreFormProps {
  onSubmit: (data: CreateChoreData | UpdateChoreData) => void;
  initialData?: Chore | null;
  householdMembers: User[];
  isSubmitting?: boolean;
}

const ChoreForm: React.FC<ChoreFormProps> = ({ onSubmit, initialData, householdMembers, isSubmitting }) => {
  const form = useForm<ChoreFormValues>({
    resolver: zodResolver(choreFormSchema),
    defaultValues: {
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
      assignedToId: initialData?.assignedToId || null,
      recurrence: initialData?.recurrence || ChoreRecurrence.NONE,
    },
  });

  const handleSubmit = (values: ChoreFormValues) => {
    const dataToSubmit: CreateChoreData | UpdateChoreData = {
      ...values,
      dueDate: values.dueDate ? format(values.dueDate, 'yyyy-MM-dd') : undefined,
      assignedToId: values.assignedToId || undefined,
      recurrence: values.recurrence === ChoreRecurrence.NONE || values.recurrence === undefined 
                  ? undefined 
                  : values.recurrence,
    };
    if (initialData) {
      (dataToSubmit as UpdateChoreData).isComplete = initialData.isComplete;
      onSubmit(dataToSubmit as UpdateChoreData);
    } else {
      onSubmit(dataToSubmit as CreateChoreData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Clean the kitchen" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional details..." {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Due Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={(date) => field.onChange(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To (Optional)</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === 'unassigned' ? null : value)} defaultValue={field.value || 'unassigned'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a household member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {householdMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="recurrence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recurrence (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ChoreRecurrence.NONE}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Set recurrence" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(ChoreRecurrence).map((recurrenceValue) => (
                    <SelectItem key={recurrenceValue} value={recurrenceValue}>
                      {recurrenceValue.charAt(0).toUpperCase() + recurrenceValue.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (initialData ? 'Saving Changes...' : 'Adding Chore...') : (initialData ? 'Save Changes' : 'Add Chore')}
        </Button>
      </form>
    </Form>
  );
};

export default ChoreForm;

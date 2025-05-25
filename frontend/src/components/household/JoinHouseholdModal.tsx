"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Loader2, LogIn } from "lucide-react";

const joinHouseholdFormSchema = z.object({
  shortCode: z
    .string()
    .length(6, { message: "Invitation code must be 6 characters." })
    .regex(/^[A-Z0-9]+$/, { message: "Code must be uppercase alphanumeric." })
    .transform((val) => val.toUpperCase()),
});

type JoinHouseholdFormValues = z.infer<typeof joinHouseholdFormSchema>;

interface JoinHouseholdModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onHouseholdJoined: () => void; // Callback to refresh user data
}

export function JoinHouseholdModal({ isOpen, onOpenChange, onHouseholdJoined }: JoinHouseholdModalProps) {
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  const form = useForm<JoinHouseholdFormValues>({
    resolver: zodResolver(joinHouseholdFormSchema),
    defaultValues: {
      shortCode: "",
    },
  });

  const onSubmit = async (values: JoinHouseholdFormValues) => {
    setIsJoining(true);
    try {
      await axiosInstance.post("/invitations/join-by-code", {
        shortCode: values.shortCode,
      });
      toast({
        title: "Successfully Joined Household!",
        description: "Welcome to your new household.",
      });
      onHouseholdJoined();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Failed to join household:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to join household. Please check the code and try again.";
      toast({
        title: "Join Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join an Existing Household</DialogTitle>
          <DialogDescription>
            Enter the 6-character invitation code provided by a household member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="shortCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invitation Code</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC123" {...field} maxLength={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isJoining}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isJoining}>
                {isJoining ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> Join Household</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Copy, Share2, RefreshCw } from "lucide-react";
import { User, UserRole } from "@/types/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PendingInvitationsList } from "./PendingInvitationsList";

const emailInviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});
type EmailInviteFormValues = z.infer<typeof emailInviteFormSchema>;

interface InviteMemberFormProps {
  householdId: string;
  currentUser: User;
  onInvitationSent?: () => void;
}

interface GeneratedCodeInfo {
  shortCode: string;
  expiresAt: string; // Assuming ISO string from backend
  householdId: string;
}

export function InviteMemberForm({ householdId, currentUser, onInvitationSent }: InviteMemberFormProps) {
  const { toast } = useToast();
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generatedCodeInfo, setGeneratedCodeInfo] = useState<GeneratedCodeInfo | null>(null);

  const emailForm = useForm<EmailInviteFormValues>({
    resolver: zodResolver(emailInviteFormSchema),
    defaultValues: { email: "" },
  });
  const { formState: { isSubmitting: isSubmittingEmail } } = emailForm;

  // Ensure consistent role checking, frontend UserRole enum is uppercase.
  // Backend might send lowercase, so convert to uppercase for comparison.
  const effectiveUserRole = currentUser.role?.toUpperCase();

  if (effectiveUserRole !== UserRole.OWNER) {
    return null;
  }

  const handleEmailInviteSubmit = async (values: EmailInviteFormValues) => {
    try {
      // Note: Endpoint name changed in backend controller
      await axiosInstance.post("/invitations/send-email", { 
        email: values.email,
        householdId: householdId,
      });
      toast({
        title: "Invitation Sent!",
        description: `An invitation email has been sent to ${values.email}.`,
      });
      emailForm.reset();
      if (onInvitationSent) {
        onInvitationSent(); 
      }
    } catch (error: any) {
      console.error("Failed to send email invitation:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to send email invitation. Please try again.";
      toast({
        title: "Email Invitation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    setGeneratedCodeInfo(null); // Clear previous code
    try {
      const response = await axiosInstance.post<GeneratedCodeInfo>("/invitations/generate-code", {
        householdId: householdId,
      });
      setGeneratedCodeInfo(response.data);
      toast({
        title: "Invitation Code Generated!",
        description: "Share this code with members you want to invite.",
      });
    } catch (error: any) {
      console.error("Failed to generate invitation code:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to generate code. Please try again.";
      toast({
        title: "Code Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard!", description: "Invitation code copied." });
    }).catch(err => {
      console.error("Failed to copy code:", err);
      toast({ title: "Copy Failed", description: "Could not copy code to clipboard.", variant: "destructive" });
    });
  };

  return (
    <div className="mt-6 pt-6 border-t space-y-8">
      {/* Email Invitation Section */}
      <div>
        <h4 className="text-lg font-semibold mb-3">Invite by Email</h4>
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(handleEmailInviteSubmit)} className="space-y-4">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email to invite" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmittingEmail} className="w-full sm:w-auto">
              {isSubmittingEmail ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Email...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Email Invitation</>
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Shareable Code Invitation Section */}
      <div>
        <h4 className="text-lg font-semibold mb-3">Invite by Shareable Code</h4>
        {!generatedCodeInfo && (
          <Button onClick={handleGenerateCode} disabled={isGeneratingCode} className="w-full sm:w-auto">
            {isGeneratingCode ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Code...</>
            ) : (
              <><Share2 className="mr-2 h-4 w-4" /> Generate New Invitation Code</>
            )}
          </Button>
        )}
        {generatedCodeInfo && (
          <Alert className="bg-primary/5 border-primary/30">
            <Share2 className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-semibold">Share this Invitation Code!</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-2xl font-bold tracking-wider text-center py-3 bg-background rounded-md border">
                {generatedCodeInfo.shortCode}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Button variant="default" size="sm" onClick={() => copyToClipboard(generatedCodeInfo.shortCode)} className="flex-1">
                  <Copy className="mr-2 h-4 w-4" /> Copy Code
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateCode} disabled={isGeneratingCode} className="flex-1">
                    {isGeneratingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" /> }
                     Generate New
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-1">
                This code allows anyone to join your household. It will expire on: {new Date(generatedCodeInfo.expiresAt).toLocaleString()}.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Display Pending Invitations */}
      {(currentUser.role === UserRole.OWNER || currentUser.role === UserRole.MEMBER ) && householdId && (
        <PendingInvitationsList currentUser={currentUser} householdId={householdId} />
      )}
    </div>
  );
} 
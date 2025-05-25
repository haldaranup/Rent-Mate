"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Home, LogIn } from "lucide-react";
import Link from "next/link";
import LocalStorageService from "@/lib/localStorage";

interface InvitationDetails {
  householdId: string;
  householdName?: string;
  expiresAt: string;
  email?: string | null;
  status: string;
}

enum PageStatus {
  LoadingDetails,       // Initial state, fetching invitation details
  DisplayingInvitation, // Details fetched, showing options to accept/decline (or login prompt)
  ProcessingAccept,     // User clicked accept, POST in progress
  Success,              // Accepted successfully
  Error,                // Generic error during any phase
  InvalidToken,         // Token missing or initial fetch failed badly
  AlreadyInHousehold,   // User is logged in and already in a household
  ProcessingDecline,    // User clicked decline, POST in progress
  DeclinedSuccess,      // Declined successfully
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [pageStatus, setPageStatus] = useState<PageStatus>(PageStatus.LoadingDetails);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token");

  const fetchInvitationDetails = useCallback(async () => {
    if (!token) {
      setPageStatus(PageStatus.InvalidToken);
      setErrorMessage("No invitation token provided.");
      return;
    }
    setPageStatus(PageStatus.LoadingDetails);
    try {
      const response = await axiosInstance.get<InvitationDetails>(`/invitations/details-by-token/${token}`);
      setInvitationDetails(response.data);

      // Check if user is logged in and already in a household
      const existingAuthToken = LocalStorageService.get<string>("rentmate_token");
      if (existingAuthToken) {
        try {
          const meResponse = await axiosInstance.get("/auth/me");
          if (meResponse.data?.householdId) {
            setPageStatus(PageStatus.AlreadyInHousehold);
            return;
          }
        } catch {
          LocalStorageService.remove("rentmate_token"); // Invalid token, clear it
        }
      }
      // If user is not in a household or not logged in, show invitation
      setPageStatus(PageStatus.DisplayingInvitation);

    } catch (error: any) {
      console.error("Failed to fetch invitation details:", error);
      const msg = error.response?.data?.message || "Failed to load invitation details. The link may be invalid or expired.";
      setErrorMessage(msg);
      if (error.response?.status === 404 || error.response?.status === 410 ) { // Not Found or Gone (expired)
        setPageStatus(PageStatus.InvalidToken); // Treat as invalid if details can't be fetched
      } else {
        setPageStatus(PageStatus.Error);
      }
    }
  }, [token, router]); // Added router to dependencies for potential future use if needed

  useEffect(() => {
    fetchInvitationDetails();
  }, [fetchInvitationDetails]);

  const handleAcceptInvitation = async () => {
    if (!token) return;
    setPageStatus(PageStatus.ProcessingAccept);
    try {
      await axiosInstance.post("/invitations/accept-by-token", { token });
      toast({
        title: "Invitation Accepted!",
        description: "You have successfully joined the household. Redirecting to dashboard...",
      });
      setPageStatus(PageStatus.Success);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Failed to accept invitation:", error);
      const msg = error.response?.data?.message || "Failed to accept invitation. The token might be invalid or expired.";
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: "Login Required",
          description: "Please log in or sign up to accept the invitation.",
          variant: "default",
          duration: 7000,
        });
        router.push(`/login?redirect=/invitations/accept?token=${token}`);
      } else if (msg.toLowerCase().includes("user is already a member of a household")) {
        setPageStatus(PageStatus.AlreadyInHousehold);
        setErrorMessage(msg);
      } else {
        setErrorMessage(msg);
        setPageStatus(PageStatus.Error);
      }
    }
  };

  const handleDeclineInvitation = async () => {
    if (!token) return;
    setPageStatus(PageStatus.ProcessingDecline);
    try {
      await axiosInstance.post("/invitations/decline-by-token", { token });
      toast({
        title: "Invitation Declined",
        description: "You have declined the invitation.",
      });
      setPageStatus(PageStatus.DeclinedSuccess);
      // Optionally, redirect or show a specific message. For now, just updates status.
    } catch (error: any) {
      console.error("Failed to decline invitation:", error);
      const msg = error.response?.data?.message || "Failed to decline invitation.";
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast({
          title: "Login Required",
          description: "Please log in or sign up to decline the invitation.",
          variant: "default",
          duration: 7000,
        });
        router.push(`/login?redirect=/invitations/accept?token=${token}`);
      } else {
        setErrorMessage(msg);
        setPageStatus(PageStatus.Error); // Revert to generic error for other issues
      }
    }
  };

  // --- Render logic based on pageStatus ---

  if (pageStatus === PageStatus.LoadingDetails) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading invitation details...</p>
      </div>
    );
  }

  if (pageStatus === PageStatus.InvalidToken) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Invalid Invitation Link</h2>
        <p className="text-muted-foreground mb-6">{errorMessage || "This invitation link is invalid, expired, or has already been used."}</p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }
  
  if (pageStatus === PageStatus.AlreadyInHousehold) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Already in a Household</h2>
        <p className="text-muted-foreground mb-6">
          {errorMessage || "You are already logged in and part of a household."}
          {invitationDetails && invitationDetails.householdId === LocalStorageService.get<any>('user_profile')?.householdId && 
           invitationDetails.householdName && 
           ` You are already a member of "${invitationDetails.householdName}".`}
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }
  
  if (pageStatus === PageStatus.DisplayingInvitation && invitationDetails) {
    const isUserLoggedIn = !!LocalStorageService.get<string>("rentmate_token");
    return (
      <div className="text-center space-y-6">
        <Home className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl sm:text-2xl font-semibold">
          You&apos;ve been invited to join
          <br />
          <span className="font-bold text-primary">{invitationDetails.householdName || "a RentMate household"}</span>!
        </h2>
        <p className="text-sm text-muted-foreground">
          Invitation for: {invitationDetails.email || "this link recipient"}.<br />
          Expires on: {new Date(invitationDetails.expiresAt).toLocaleString()}
        </p>
        
        {isUserLoggedIn ? (
            <Button onClick={handleAcceptInvitation} size="lg" className="w-full">
              <CheckCircle className="mr-2 h-5 w-5" /> Accept Invitation
            </Button>
        ) : (
          <div className="space-y-3">
             <p className="text-sm text-muted-foreground">Please log in or sign up to respond.</p>
            <Button onClick={() => router.push(`/login?redirect=/invitations/accept?token=${token}`)} size="lg" className="w-full">
              <LogIn className="mr-2 h-5 w-5" /> Login to Respond
            </Button>
            <Button onClick={() => router.push(`/signup?redirect=/invitations/accept?token=${token}`)} size="lg" variant="outline" className="w-full">
              Sign Up to Respond
            </Button>
          </div>
        )}
        {/* Decline Button for logged-in users */}
        {isUserLoggedIn && pageStatus === PageStatus.DisplayingInvitation && (
            <Button onClick={handleDeclineInvitation} size="lg" variant="outline" className="w-full mt-3">
                <XCircle className="mr-2 h-5 w-5" /> Decline Invitation
            </Button>
        )}
        <p className="text-xs text-muted-foreground pt-4">
          If you weren&apos;t expecting this, you can close this page.
        </p>
      </div>
    );
  }

  if (pageStatus === PageStatus.ProcessingAccept || pageStatus === PageStatus.ProcessingDecline) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          {pageStatus === PageStatus.ProcessingAccept ? "Accepting your invitation..." : "Processing decline..."}
        </p>
      </div>
    );
  }

  if (pageStatus === PageStatus.Success) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Invitation Accepted!</h2>
        <p className="text-muted-foreground mb-6">
          You&apos;ve successfully joined {invitationDetails?.householdName || "the household"}. You will be redirected to your dashboard.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (pageStatus === PageStatus.DeclinedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <XCircle className="h-12 w-12 text-orange-500 mb-4" /> 
        <h2 className="text-2xl font-semibold mb-2">Invitation Declined</h2>
        <p className="text-muted-foreground mb-6">
          You have chosen not to join {invitationDetails?.householdName || "the household"}.
        </p>
        <Button asChild>
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // PageStatus.Error or any unhandled state
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <XCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Invitation Error</h2>
      <p className="text-muted-foreground mb-6">
        {errorMessage || "An unexpected error occurred. Please try again or contact support."}
      </p>
      <div className="flex space-x-4">
        <Button asChild variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
        {token && 
          <Button onClick={() => router.push(`/login?redirect=/invitations/accept?token=${token}`)}>Login to try again</Button>
        }
      </div>
    </div>
  );
}


export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading invitation...</p>
      </div>
    }>
      <AcceptInvitationPageContent/>
    </Suspense>
  );
}

function AcceptInvitationPageContent() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 dark:from-slate-900 dark:to-stone-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {/* Title can be more dynamic once details are loaded, or kept generic here */}
          <CardTitle className="text-2xl sm:text-3xl font-bold">
            Household Invitation
          </CardTitle>
         {/* Removed CardDescription from header, content will show details */}
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <AcceptInvitationContent />
        </CardContent>
      </Card>
    </div>
  );
} 
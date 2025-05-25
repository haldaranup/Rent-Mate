"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation"; // For redirection
import React from "react"; // Import React for Suspense
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Import Button
import { SignupForm } from "@/components/auth/SignupForm"; // Import the new component
import { UserPlus } from "lucide-react"; // Import a relevant icon for signup
import { PageLoader } from "@/components/ui/page-loader"; // Import PageLoader

// New component to encapsulate logic using useSearchParams
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSignupSuccess = () => {
    const redirectUrl = searchParams.get("redirect");
    if (redirectUrl) {
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    } else {
      router.push("/login");
    }
  };

  return (
    <>
      <SignupForm onSignupSuccess={handleSignupSuccess} />
      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Button variant="link" asChild className="p-0 h-auto font-medium text-primary">
          <Link href="/login">
            Log in
          </Link>
        </Button>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 pb-4 space-y-6 bg-background text-foreground pt-0">
      <div className="flex flex-col items-center text-center">
        <UserPlus className="h-12 w-12 text-primary mb-3" />
        <h1 className="text-3xl font-bold text-primary">Join RentMate</h1>
        <p className="text-muted-foreground text-sm">Create your account to get started.</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Create your Account
          </CardTitle>
          <CardDescription>
            Sign up to easily manage chores and expenses with your roommates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <React.Suspense fallback={<PageLoader />}>
            <SignupContent />
          </React.Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

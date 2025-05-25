"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/auth/LoginForm";
import { Home } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLoginSuccess = () => {
    const redirectUrl = searchParams.get("redirect");
    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <>
      <LoginForm onLoginSuccess={handleLoginSuccess} />
      <div className="mt-4 text-center text-sm">
        Don't have an account?{" "}
        <Button variant="link" asChild className="p-0 h-auto font-medium text-primary">
          <Link href="/signup">
            Sign up
          </Link>
        </Button>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 pb-4 space-y-6 bg-background text-foreground pt-0">
      <div className="flex flex-col items-center text-center">
        <Home className="h-12 w-12 text-primary mb-3" />
        <h1 className="text-3xl font-bold text-primary">RentMate</h1>
        <p className="text-muted-foreground text-sm">Shared Living, Simplified</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Login to Your Account
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your household.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <React.Suspense fallback={<PageLoader />}>
            <LoginContent />
          </React.Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

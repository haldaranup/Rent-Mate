"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import LocalStorageService from "@/lib/localStorage";
import { User } from "@/types/user";
import BalanceOverview from "@/components/expenses/BalanceOverview";
import SettleUpSuggestions from "@/components/expenses/SettleUpSuggestions";
import { Loader2, AlertTriangle, HandCoins, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinancesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoadingUser(true);
      try {
        const token = LocalStorageService.get<string>("rentmate_token");
        if (!token) {
          router.push("/login?redirect=/finances");
          return;
        }
        const response = await axiosInstance.get("/auth/me");
        setCurrentUser(response.data);
        if (!response.data.householdId) {
          toast({
            title: "No Household",
            description: "You need to be part of a household to view finances. Redirecting to dashboard...",
            variant: "destructive",
          });
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Failed to fetch user profile for finances:", error);
        toast({
          title: "Error Loading Data",
          description: "Could not fetch your user profile. Please try logging in again.",
          variant: "destructive",
        });
        LocalStorageService.remove("rentmate_token");
        router.push("/login?redirect=/finances");
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserProfile();
  }, [router, toast]);

  if (isLoadingUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-120px)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  if (!currentUser || !currentUser.householdId) {
    // This case should ideally be handled by the redirect in useEffect,
    // but it's a fallback.
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-120px)] p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-muted-foreground">
          Could not load financial data or you are not part of a household.
        </p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-6">
      <header className="mb-8 md:mb-12 pb-6 border-b">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <HandCoins className="h-10 w-10 text-primary hidden sm:block" />
                <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                    Household Finances
                </h1>
                <p className="text-md sm:text-lg text-muted-foreground">
                    Overview of balances and settlement suggestions.
                </p>
                </div>
            </div>
            <Button variant="outline" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Link>
            </Button>
        </div>
      </header>

      <main className="bg-card/30 dark:bg-muted/10 p-4 sm:p-6 rounded-xl shadow-sm flex flex-col gap-6 md:gap-8">
        <BalanceOverview householdId={currentUser.householdId} />
        <SettleUpSuggestions householdId={currentUser.householdId} />
      </main>
    </div>
  );
} 
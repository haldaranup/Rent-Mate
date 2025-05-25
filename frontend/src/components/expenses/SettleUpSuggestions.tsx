"use client";

import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { SettleUpSuggestion } from '@/types/expense';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2, ArrowRight, Users, HandCoins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettleUpSuggestionsProps {
  householdId: string;
}

export default function SettleUpSuggestions({ householdId }: SettleUpSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SettleUpSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!householdId) return;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/expenses/household/settle-up`);
        setSuggestions(response.data);
      } catch (err: any) {
        console.error("Failed to fetch settle-up suggestions:", err);
        setError("Could not load settlement suggestions. Please try again later.");
        toast({
          title: "Error Loading Suggestions",
          description: err.response?.data?.message || "Failed to fetch settlement suggestions.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };

    fetchSuggestions();
  }, [householdId, toast]);

  if (isLoading) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center"><HandCoins className="mr-2 h-5 w-5 text-primary"/> Settle Up Suggestions</CardTitle>
          <CardDescription>Calculating the easiest way to settle debts...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Loading suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center"><HandCoins className="mr-2 h-5 w-5 text-destructive"/> Settle Up Suggestions</CardTitle>
          <CardDescription>There was an issue loading suggestions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-destructive font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center"><HandCoins className="mr-2 h-5 w-5 text-primary"/> Settle Up Suggestions</CardTitle>
          <CardDescription>Optimal payment paths to clear all debts.</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Users className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">All Balanced!</p>
          <p className="text-sm text-muted-foreground">No settlements are needed at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center"><HandCoins className="mr-2 h-5 w-5 text-primary"/> Settle Up Suggestions</CardTitle>
        <CardDescription>Follow these payments to settle all household debts efficiently.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <li 
              key={`${suggestion.fromUserId}-${suggestion.toUserId}-${index}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-secondary/30 dark:bg-secondary/20 rounded-lg shadow-sm"
            >
              <div className="flex items-center mb-2 sm:mb-0">
                <span className="font-medium text-foreground break-all">{suggestion.fromUserName}</span>
                <ArrowRight className="h-5 w-5 text-muted-foreground mx-2 sm:mx-3 shrink-0" />
                <span className="font-medium text-foreground break-all">{suggestion.toUserName}</span>
              </div>
              <span className="font-semibold text-lg text-primary whitespace-nowrap sm:ml-4">
                ₹{suggestion.amount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
} 
'use client';

import React, { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { UserBalance } from '@/types/expense'; // Ensure this path is correct
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BalanceOverviewProps {
  householdId: string | null;
}

const BalanceOverview: React.FC<BalanceOverviewProps> = ({ householdId }) => {
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!householdId) {
      setIsLoading(false);
      setBalances([]); // Clear balances if no householdId
      return;
    }

    const fetchBalances = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get<UserBalance[]>('/expenses/household/balances');
        setBalances(response.data);
      } catch (error) {
        console.error('Error fetching balances:', error);
        toast({
          title: 'Error Fetching Balances',
          description: 'Could not load household balances. Please try again later.',
          variant: 'destructive',
        });
        setBalances([]); // Clear balances on error
      }
      setIsLoading(false);
    };

    fetchBalances();
  }, [householdId, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (!householdId) {
    // Optionally render something if no household, or rely on parent component to not render this.
    // For now, it will render nothing if balances are empty due to no householdId.
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Balance Overview</CardTitle>
          <CardDescription>Loading household member balances...</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading...</p> {/* Replace with Skeleton later */}
        </CardContent>
      </Card>
    );
  }

  if (balances.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Balance Overview</CardTitle>
          <CardDescription>No balances to display. This might be because there are no expenses or no members in the household.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No balance data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Balance Overview</CardTitle>
        <CardDescription>Summary of who owes whom in your household.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Net Balance</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead className="text-right">Total Owed (Unsettled)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((balance) => (
              <TableRow key={balance.userId}>
                <TableCell>
                  <div className="font-medium">{balance.name}</div>
                  <div className="text-xs text-muted-foreground">{balance.email}</div>
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  balance.netBalance > 0 ? 'text-green-600' : balance.netBalance < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  <span className="inline-flex items-center">
                    {balance.netBalance > 0 && <TrendingUp className="mr-1 h-4 w-4" />}
                    {balance.netBalance < 0 && <TrendingDown className="mr-1 h-4 w-4" />}
                    {balance.netBalance === 0 && <Minus className="mr-1 h-4 w-4" />}
                    {formatCurrency(balance.netBalance)}
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(balance.totalPaid)}</TableCell>
                <TableCell className="text-right">{formatCurrency(balance.totalOwed)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default BalanceOverview; 
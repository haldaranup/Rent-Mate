import { User } from './user';

export interface ExpenseShare {
  id: string;
  expenseId: string;
  owedById: string;
  owedBy?: Pick<User, 'id' | 'name' | 'email'>; // Use Pick for leaner type
  amountOwed: number;
  isSettled: boolean;
  createdAt: string; // Assuming ISO string format
  updatedAt: string; // Assuming ISO string format
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // Assuming ISO string format, e.g., YYYY-MM-DD
  householdId: string;
  paidById?: string | null;
  paidBy?: Pick<User, 'id' | 'name' | 'email'> | null; // Use Pick for leaner type
  shares: ExpenseShare[];
  createdAt: string; // Assuming ISO string format
  updatedAt: string; // Assuming ISO string format
}

// Mirror the backend interface for user balances
export interface UserBalance {
  userId: string;
  name: string;
  email: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface SettleUpSuggestion {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
} 
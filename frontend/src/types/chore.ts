import { User } from './user';

// Mirror the backend enum
export enum ChoreRecurrence {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi-weekly',
  MONTHLY = 'monthly',
}

export interface Chore {
  id: string;
  description: string;
  notes?: string | null;
  isComplete: boolean;
  dueDate?: string | null;      // Comes as ISO string, can be null
  recurrence: ChoreRecurrence;
  createdAt: string;           // Comes as ISO string
  updatedAt: string;           // Comes as ISO string
  householdId: string;
  assignedToId?: string | null;
  assignedTo?: User | null;     // Populated from backend relation, can be null
  completedById?: string | null;
  completedBy?: User | null;    // Populated from backend relation, can be null
  completedAt?: string | null;  // Comes as ISO string, can be null
}

// For form handling and API calls
export type CreateChoreData = {
  description: string;
  notes?: string;
  dueDate?: string;      // Expected format YYYY-MM-DD, or empty for null
  assignedToId?: string; // UUID, or empty for null
  recurrence?: ChoreRecurrence;
};

export type UpdateChoreData = {
  description?: string;
  notes?: string;        // Use empty string to clear, or provide value
  dueDate?: string | null;      // YYYY-MM-DD, or null to clear
  assignedToId?: string | null; // UUID, or null to unassign
  isComplete?: boolean;
  recurrence?: ChoreRecurrence;
}; 
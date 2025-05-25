import { User } from './user';

export interface Household {
  id: string;
  name: string;
  members?: User[]; // Optional to prevent deep nesting issues if not always needed
  createdAt: string; // Assuming ISO string format
  updatedAt: string; // Assuming ISO string format
} 
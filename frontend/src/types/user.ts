import { Household } from './household';

export enum UserRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  householdId?: string | null;
  household?: Household | null;
  createdAt: string;
  updatedAt: string;
}
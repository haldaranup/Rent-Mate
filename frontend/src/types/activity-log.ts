export enum ActivityType {
  // Chore related
  CHORE_CREATED = 'CHORE_CREATED',
  CHORE_UPDATED = 'CHORE_UPDATED', // General update
  CHORE_ASSIGNED = 'CHORE_ASSIGNED',
  CHORE_COMPLETED = 'CHORE_COMPLETED',
  CHORE_RECURRENCE_UPDATED = 'CHORE_RECURRENCE_UPDATED',
  CHORE_ROTATED = 'CHORE_ROTATED', // Specifically when recurrence causes rotation
  CHORE_DELETED = 'CHORE_DELETED',

  // Expense related
  EXPENSE_CREATED = 'EXPENSE_CREATED',
  EXPENSE_UPDATED = 'EXPENSE_UPDATED',
  EXPENSE_DELETED = 'EXPENSE_DELETED',
  EXPENSE_SHARE_SETTLED = 'EXPENSE_SHARE_SETTLED',
  EXPENSE_SHARE_UNSETTLED = 'EXPENSE_SHARE_UNSETTLED', // If you allow un-settling

  // Household related
  HOUSEHOLD_CREATED = 'HOUSEHOLD_CREATED', // Might be rare if households are setup once
  HOUSEHOLD_UPDATED = 'HOUSEHOLD_UPDATED', // e.g., name change
  USER_JOINED_HOUSEHOLD = 'USER_JOINED_HOUSEHOLD',
  USER_LEFT_HOUSEHOLD = 'USER_LEFT_HOUSEHOLD', // Or removed

  // Invitation related
  INVITATION_SENT = 'INVITATION_SENT', // If you log sending of email/link invites
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED', // Covered by USER_JOINED_HOUSEHOLD if they join immediately
  INVITATION_REVOKED = 'INVITATION_REVOKED',
  SHORTCODE_CREATED = 'SHORTCODE_CREATED',

  // User profile related (optional, might be too much noise)
  // USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
}

export interface Actor {
  id: string;
  name: string | null; // Name might be null if user was deleted
  email?: string; // Email might not always be available or relevant for display
}

export interface ActivityLog {
  id: string;
  actor: Actor | null; // Actor can be null if system generated or actor deleted
  activityType: ActivityType;
  entityType: string; // e.g., "Chore", "Expense", "User"
  entityId: string | null; // ID of the Chore, Expense, etc. Can be null if not applicable.
  details: Record<string, any> | string | null; // Flexible JSON object or simple string for details
  createdAt: string; // ISO date string
  householdId: string;
}

export interface PaginatedActivityLogResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// For creating a log, usually on backend.
// export interface CreateActivityLogDto {
//   actorId?: string | null; // Optional: System actions might not have an actor
//   householdId: string;
//   activityType: ActivityType;
//   entityType: string;
//   entityId?: string | null;
//   details?: Record<string, any> | string | null;
// } 
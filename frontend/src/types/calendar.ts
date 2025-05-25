export enum CalendarEventType {
  CHORE = 'CHORE',
  EXPENSE = 'EXPENSE',
}

export interface CalendarEventExtendedProps {
  choreId?: string;
  expenseId?: string;
  description?: string;
  isComplete?: boolean;
  amount?: number;
  paidByName?: string;
  // Add any other custom properties from your backend DTO
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end?: string; // ISO date string, optional
  allDay: boolean;
  type: CalendarEventType;
  color?: string;
  extendedProps?: CalendarEventExtendedProps;
} 
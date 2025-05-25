import { ApiProperty } from '@nestjs/swagger';

export enum CalendarEventType {
  CHORE = 'CHORE',
  EXPENSE = 'EXPENSE',
}

export class CalendarEventExtendedPropsDto {
  @ApiProperty({ required: false, description: 'Original ID of the chore, if event type is CHORE' })
  choreId?: string;

  @ApiProperty({ required: false, description: 'Original ID of the expense, if event type is EXPENSE' })
  expenseId?: string;

  @ApiProperty({ required: false, description: 'Description of the chore or expense' })
  description?: string;

  @ApiProperty({ required: false, description: 'Completion status, if event type is CHORE' })
  isComplete?: boolean;

  @ApiProperty({ required: false, type: 'number', description: 'Amount, if event type is EXPENSE' })
  amount?: number;

  @ApiProperty({ required: false, description: 'Name of the user who paid, if event type is EXPENSE' })
  paidByName?: string;

  // Add any other custom properties you might want to pass to the frontend calendar event
}

export class CalendarEventDto {
  @ApiProperty({ example: 'chore-123e4567-e89b-12d3-a456-426614174000', description: 'Unique ID of the calendar event' })
  id: string;

  @ApiProperty({ example: 'Clean the kitchen', description: 'Title of the event' })
  title: string;

  @ApiProperty({ example: '2024-07-28T10:00:00.000Z', description: 'Start date/time of the event (ISO string)' })
  start: string;

  @ApiProperty({ example: '2024-07-28T10:00:00.000Z', description: 'End date/time of the event (ISO string)', required: false })
  end?: string; // Optional, can be same as start for single-day/timed events

  @ApiProperty({ example: true, description: 'Indicates if the event is an all-day event', default: true })
  allDay: boolean;

  @ApiProperty({ enum: CalendarEventType, example: CalendarEventType.CHORE, description: 'Type of the event' })
  type: CalendarEventType;

  @ApiProperty({ example: '#3182CE', description: 'Color for the event on the calendar', required: false })
  color?: string;

  @ApiProperty({ type: () => CalendarEventExtendedPropsDto, description: 'Additional properties for the event', required: false })
  extendedProps?: CalendarEventExtendedPropsDto;
} 
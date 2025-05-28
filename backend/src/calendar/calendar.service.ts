import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Chore } from '../chores/entities/chore.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { User } from '../users/entities/user.entity';
import {
  CalendarEventDto,
  CalendarEventType,
  CalendarEventExtendedPropsDto,
} from './dto';
import { isValid, parseISO, formatISO } from 'date-fns';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Chore)
    private choreRepository: Repository<Chore>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async getCalendarEvents(
    householdId: string,
    startDateStr: string,
    endDateStr: string,
    requestingUser: User,
  ): Promise<CalendarEventDto[]> {
    if (requestingUser.householdId !== householdId) {
      throw new UnauthorizedException(
        'Cannot fetch calendar events for another household.',
      );
    }

    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);

    if (!isValid(startDate) || !isValid(endDate)) {
      throw new BadRequestException('Invalid start or end date format.');
    }

    const chores = await this.choreRepository.find({
      where: {
        householdId,
        dueDate: Between(startDate, endDate),
      },
      relations: ['assignedTo'], // Include relations needed for extendedProps if any
    });

    // Assuming Expense.date is a Date object in the entity based on typical TypeORM usage
    // If Expense.date is a string, the entity definition or DTO handling needs adjustment.
    const expenses = await this.expenseRepository.find({
      where: {
        householdId,
        // This line assumes 'date' in Expense entity is of type Date for Between to work correctly with Date objects.
        // If 'date' is string, this might need conversion of startDate/endDate to string,
        // or better, fix the entity to use Date type for the 'date' field.
        date: Between(startDate, endDate) as any, // Using 'as any' to bypass strict type check temporarily, review Expense.date type.
      },
      relations: ['paidBy'], // For paidByName in extendedProps
    });

    const calendarEvents: CalendarEventDto[] = [];

    chores.forEach((chore) => {
      if (chore.dueDate) {
        // Ensure dueDate is not null
        const extendedProps: CalendarEventExtendedPropsDto = {
          choreId: chore.id,
          description: chore.description,
          isComplete: chore.isComplete,
          // assignedToName: chore.assignedTo?.name, // Example if needed
        };
        calendarEvents.push({
          id: `chore-${chore.id}`,
          title: chore.description || 'Chore',
          start: formatISO(chore.dueDate), // Use formatISO for safety
          end: formatISO(chore.dueDate), // Use formatISO for safety
          allDay: true,
          type: CalendarEventType.CHORE,
          color: chore.isComplete ? '#A0AEC0' : '#4299E1', // Gray for completed, Blue for pending
          extendedProps,
        });
      }
    });

    expenses.forEach((expense) => {
      const extendedProps: CalendarEventExtendedPropsDto = {
        expenseId: expense.id,
        description: expense.description,
        amount: expense.amount,
        paidByName: expense.paidBy?.name || expense.paidBy?.email,
      };
      calendarEvents.push({
        id: `expense-${expense.id}`,
        title: expense.description || 'Expense',
        start: formatISO(expense.date), // Use formatISO
        end: formatISO(expense.date), // Use formatISO
        allDay: true,
        type: CalendarEventType.EXPENSE,
        color: '#48BB78', // Green for expenses
        extendedProps,
      });
    });

    return calendarEvents;
  }
}

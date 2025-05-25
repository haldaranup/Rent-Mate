import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { Chore } from '../chores/entities/chore.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { AuthModule } from '../auth/auth.module'; // For guards or user info if needed directly

@Module({
  imports: [
    TypeOrmModule.forFeature([Chore, Expense]),
    AuthModule, // If controller uses AuthGuard or needs auth services
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {} 
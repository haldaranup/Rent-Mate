import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './entities/expense.entity';
import { ExpenseShare } from './entities/expense-share.entity';
import { HouseholdsModule } from '../households/households.module'; // For household validation
import { UsersModule } from '../users/users.module'; // For user validation

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseShare]),
    HouseholdsModule, // To use HouseholdsService
    UsersModule, // To use UsersService
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService], // Export if other modules need it
})
export class ExpensesModule {}

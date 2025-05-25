import { IsString, IsNotEmpty, IsNumber, IsDateString, IsUUID, ValidateNested, IsArray, ArrayNotEmpty, IsOptional, MinLength, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseShareDto } from './expense-share.dto';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number; // Total amount of the expense

  @IsNotEmpty()
  @IsDateString()
  date: string; // YYYY-MM-DD format

  @IsOptional()
  @IsUUID()
  paidById?: string; // User who paid the expense

  // How the expense is split. Can be flexible: e.g. even split, specific amounts, percentages.
  // For simplicity now, let's assume the frontend sends the specific amounts for each user involved.
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareDto)
  shares: ExpenseShareDto[];
} 
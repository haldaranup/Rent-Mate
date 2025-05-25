import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class ExpenseShareDto {
  @IsNotEmpty()
  @IsUUID()
  owedById: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountOwed: number;
} 
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ChoreRecurrence } from '../entities/chore.entity'; // Import enum

export class CreateChoreDto {
  @IsNotEmpty({ message: 'Description is required.' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string; // YYYY-MM-DD format

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(ChoreRecurrence)
  recurrence?: ChoreRecurrence;

  // householdId is removed as it is derived from the authenticated user
  // createdById will be set from the authenticated user in the service
} 
import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsBoolean,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ChoreRecurrence } from '../entities/chore.entity'; // Import enum

export class UpdateChoreDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null; // Allow null to clear the due date

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null; // Allow null to unassign

  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @IsOptional()
  @IsEnum(ChoreRecurrence)
  recurrence?: ChoreRecurrence;

  // completedById and completedAt will be set by the service when isComplete is toggled to true
}

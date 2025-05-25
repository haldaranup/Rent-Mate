import { ActivityType } from '../entities/activity-log.entity'; // Corrected import
import { IsString, IsEnum, IsOptional, IsObject, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreateActivityLogDto {
  @IsString()
  @IsNotEmpty()
  householdId: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => o.actorId !== null) // Ensure actorId is validated if provided, but allow null
  actorId?: string | null; // Actor can be null for system events

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityType: string; // e.g., 'Chore', 'Expense'

  @IsEnum(ActivityType)
  @IsNotEmpty()
  activityType: ActivityType;

  @IsObject()
  @IsOptional()
  details?: Record<string, any>;
} 
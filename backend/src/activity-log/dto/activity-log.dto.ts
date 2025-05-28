import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../entities/activity-log.entity';

export class ActorDto {
  @ApiProperty({
    example: 'clx3znh0c0000s9ign9p887e4',
    description: 'ID of the user who performed the action',
  })
  id: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the user who performed the action',
  })
  name: string;
}

export class ActivityLogDto {
  @ApiProperty({
    example: 'clx50qweb0000s9amplingactivityid',
    description: 'Unique ID of the activity log entry',
  })
  id: string;

  @ApiProperty({
    example: 'clx3znh0c0000s9ign9p887e4',
    description: 'ID of the household this activity belongs to',
  })
  householdId: string;

  @ApiProperty({
    type: () => ActorDto,
    nullable: true,
    description: 'The user who performed the action (if applicable)',
  })
  actor?: ActorDto | null;

  @ApiProperty({
    example: 'clx4fgn550000s9upqrs12345',
    description:
      'ID of the entity (e.g., Chore, Expense) this activity relates to',
  })
  entityId: string;

  @ApiProperty({
    example: 'Chore',
    description: 'Type of the entity (e.g., Chore, Expense)',
  })
  entityType: string;

  @ApiProperty({
    enum: ActivityType,
    enumName: 'ActivityType',
    example: ActivityType.CHORE_CREATED,
    description: 'Type of activity performed',
  })
  activityType: ActivityType;

  @ApiProperty({
    type: 'object',
    example: {
      oldValue: { description: 'Old text' },
      newValue: { description: 'New text' },
    },
    description: 'Detailed information about the activity (e.g., changes made)',
    nullable: true,
  })
  details?: Record<string, any> | null;

  @ApiProperty({ description: 'Timestamp of when the activity occurred' })
  createdAt: Date;
}

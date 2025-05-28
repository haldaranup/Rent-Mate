import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity'; // Assuming path to User entity
import { Household } from '../../households/entities/household.entity'; // Assuming path to Household entity

export enum ActivityType {
  // Chore related
  CHORE_CREATED = 'CHORE_CREATED',
  CHORE_COMPLETED = 'CHORE_COMPLETED',
  CHORE_UPDATED = 'CHORE_UPDATED',
  CHORE_DELETED = 'CHORE_DELETED',
  CHORE_ASSIGNED = 'CHORE_ASSIGNED',
  CHORE_UNASSIGNED = 'CHORE_UNASSIGNED',
  CHORE_ROTATED = 'CHORE_ROTATED',

  // Expense related
  EXPENSE_CREATED = 'EXPENSE_CREATED',
  EXPENSE_UPDATED = 'EXPENSE_UPDATED',
  EXPENSE_DELETED = 'EXPENSE_DELETED',
  EXPENSE_SHARE_SETTLED = 'EXPENSE_SHARE_SETTLED',
  EXPENSE_SHARE_UNSETTLED = 'EXPENSE_SHARE_UNSETTLED',

  // Household related activities
  HOUSEHOLD_CREATED = 'HOUSEHOLD_CREATED',
  HOUSEHOLD_UPDATED = 'HOUSEHOLD_UPDATED',
  HOUSEHOLD_MEMBER_ADDED = 'HOUSEHOLD_MEMBER_ADDED',
  HOUSEHOLD_MEMBER_REMOVED = 'HOUSEHOLD_MEMBER_REMOVED',

  // Invitation related - can be added if desired
  // INVITATION_SENT = 'INVITATION_SENT',
  // INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  // INVITATION_REJECTED = 'INVITATION_REJECTED',
}

@Entity('activity_logs')
@Index(['household', 'createdAt'])
@Index(['entityId'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Household, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'householdId' })
  household: Household;

  @Column()
  householdId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor?: User | null;

  @Column({ nullable: true })
  actorId?: string | null;

  @Column()
  entityId: string; // ID of the entity involved (e.g., Chore ID, Expense ID)

  @Column()
  entityType: string; // Type of entity, e.g., "Chore", "Expense"

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}

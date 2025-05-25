import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Household } from '../../households/entities/household.entity';
import { User } from '../../users/entities/user.entity';

export enum ChoreRecurrence {
  NONE = 'none', // Default, not recurring
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi-weekly', // Every two weeks
  MONTHLY = 'monthly',
  // YEARLY = 'yearly', // if needed
}

@Entity('chores')
export class Chore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true }) // Made description nullable
  description?: string;

  @Column({ type: 'text', nullable: true }) // Detailed description, optional
  notes?: string;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate: Date | null;

  @Column({
    type: 'enum',
    enum: ChoreRecurrence,
    default: ChoreRecurrence.NONE,
  })
  recurrence: ChoreRecurrence;

  @CreateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // --- Relations ---
  @Column({ type: 'uuid' })
  householdId: string;

  @ManyToOne(() => Household, household => household.chores, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'householdId' })
  household: Household;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null; // Standardized name

  @ManyToOne(() => User, user => user.assignedChores, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' }) // Standardized name for join column
  assignedTo: User | null;

  @Column({ type: 'uuid', nullable: true })
  completedById: string | null; // User who marked it complete

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completedById' })
  completedBy: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null; // When it was marked complete

  // createdById is removed for now, can be added if specific tracking is needed beyond audit logs or JWT user context
} 
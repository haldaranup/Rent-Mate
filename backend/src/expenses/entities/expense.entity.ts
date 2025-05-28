import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Household } from '../../households/entities/household.entity';
import { User } from '../../users/entities/user.entity';
import { ExpenseShare } from './expense-share.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: string; // Store as YYYY-MM-DD string

  @ManyToOne(() => Household, (household) => household.expenses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'householdId' })
  household: Household;

  @Index()
  @Column()
  householdId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) // User who paid
  @JoinColumn({ name: 'paidById' })
  paidBy: User | null;

  @Index()
  @Column({ nullable: true })
  paidById: string | null;

  @OneToMany(() => ExpenseShare, (share) => share.expense, { cascade: true })
  shares: ExpenseShare[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

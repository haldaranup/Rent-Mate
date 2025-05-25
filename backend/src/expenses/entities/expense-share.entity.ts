import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Expense } from './expense.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expense_shares')
export class ExpenseShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Expense, (expense) => expense.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expenseId' })
  expense: Expense;

  @Index()
  @Column()
  expenseId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' }) // User who owes this share
  @JoinColumn({ name: 'owedById' })
  owedBy: User;

  @Index()
  @Column()
  owedById: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amountOwed: number;

  @Column({ default: false })
  isSettled: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
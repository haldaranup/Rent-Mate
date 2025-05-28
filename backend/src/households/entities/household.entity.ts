import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chore } from '../../chores/entities/chore.entity';
import { Expense } from '../../expenses/entities/expense.entity';
import { Invitation } from '../../invitations/entities/invitation.entity';

@Entity('households')
export class Household {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Relation to Users: A household can have many users
  @OneToMany(() => User, (user) => user.household, { cascade: true })
  members: User[];

  // Relation to Chores: A household can have many chores
  @OneToMany(() => Chore, (chore) => chore.household, { cascade: true })
  chores: Chore[];

  // Relation to Expenses: A household can have many expenses
  @OneToMany(() => Expense, (expense) => expense.household, { cascade: true })
  expenses: Expense[];

  // Relation to Invitations: A household can have many pending/processed invitations
  @OneToMany(() => Invitation, (invitation) => invitation.household, {
    cascade: true,
  })
  invitations: Invitation[];

  // Optional: If you want to explicitly track an owner.
  // Alternatively, the first user or a user with a specific role can be considered the owner.
  // For now, we can rely on the UserRole.OWNER within the User entity for members of this household.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

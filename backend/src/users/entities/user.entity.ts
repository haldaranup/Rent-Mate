import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Household } from '../../households/entities/household.entity';
import { Chore } from '../../chores/entities/chore.entity';

export enum UserRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string; // Will be hashed

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  // For simplicity, role is on User for now. This might be moved to a HouseholdMember entity later.
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  // Relation to Household: A user belongs to one household (optional for now, a user might not be in a household yet)
  @ManyToOne(() => Household, (household) => household.members, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'householdId' })
  household?: Household | null; // User can be initially null if not part of a household

  @Column({ type: 'uuid', nullable: true })
  householdId?: string | null; // Foreign key column

  // Relation to Chores: A user can be assigned many chores
  @OneToMany(() => Chore, (chore) => chore.assignedTo)
  assignedChores: Chore[];

  // We might also want a list of chores createdBy this user if we implement that relation fully
  // @OneToMany(() => Chore, (chore) => chore.createdBy)
  // createdChores: Chore[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
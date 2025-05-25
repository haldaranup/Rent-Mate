import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Household } from '../../households/entities/household.entity';
import { User } from '../../users/entities/user.entity'; // For invitedBy

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled', // If the inviter cancels it
}

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null; // Email of the invitee, optional for short codes

  @Column({ type: 'uuid' })
  householdId: string;

  @ManyToOne(() => Household, (household) => household.invitations, {
    onDelete: 'CASCADE', // If household is deleted, its invitations are deleted
  })
  @JoinColumn({ name: 'householdId' })
  household: Household;

  @Column({ type: 'uuid' })
  invitedById: string; // User who sent the invitation

  @ManyToOne(() => User, { onDelete: 'SET NULL' }) // If inviter is deleted, keep the invitation but nullify inviter
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string; // Secure, unique token for the invitation link

  @Column({ type: 'varchar', length: 16, nullable: true, unique: true }) // Short, shareable code, NOW globally unique
  shortCode?: string | null;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acceptedAt?: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'acceptedByUserId' })
  acceptedByUser?: User | null;

  @Column({ nullable: true })
  acceptedByUserId?: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

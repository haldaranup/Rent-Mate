import { Injectable, Logger, Inject, forwardRef, HttpException, HttpStatus, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus } from './entities/invitation.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { HouseholdsService } from '../households/households.service';
import { Household } from '../households/entities/household.entity';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActivityType } from '../activity-log/entities/activity-log.entity';

const SHORT_CODE_LENGTH = 6;
const SHORT_CODE_CHARSET = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Removed O, 0 to avoid confusion
const SHORT_CODE_MAX_RETRIES = 10;
const SHORT_CODE_EXPIRES_IN_HOURS = 24; // Short codes valid for 24 hours

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private invitationsRepository: Repository<Invitation>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => HouseholdsService))
    private readonly householdsService: HouseholdsService,
    private readonly configService: ConfigService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async generateShortCode(): Promise<string> {
    for (let i = 0; i < SHORT_CODE_MAX_RETRIES; i++) {
      let code = '';
      for (let j = 0; j < SHORT_CODE_LENGTH; j++) {
        code += SHORT_CODE_CHARSET.charAt(Math.floor(Math.random() * SHORT_CODE_CHARSET.length));
      }
      // Check if this code is already active GLOBALLY
      const existing = await this.invitationsRepository.findOne({
        where: {
          shortCode: code,
          status: InvitationStatus.PENDING, // Only check against other PENDING short codes
        }
      });
      if (!existing) {
        return code;
      }
    }
    this.logger.error(`Failed to generate a globally unique short code after ${SHORT_CODE_MAX_RETRIES} retries.`);
    throw new InternalServerErrorException('Could not generate a unique invitation code. Please try again.');
  }

  async createEmailInvitation(
    householdId: string,
    inviteeEmail: string,
    invitingUser: User,
  ): Promise<Invitation> {
    this.logger.log(
      `Attempting to create EMAIL invitation for ${inviteeEmail} to household ${householdId} by user ${invitingUser.id}`,
    );

    const household = await this.householdsService.findOneById(householdId);
    if (!household) {
      this.logger.warn(`Household not found: ${householdId}`);
      throw new HttpException('Household not found', HttpStatus.NOT_FOUND);
    }

    if (invitingUser.householdId !== householdId /* && invitingUser.role !== UserRole.OWNER */) {
      // Consider allowing OWNER to invite even if not currently set to this household (e.g. admin user)
      // For now, strict membership is required.
      this.logger.warn(
        `User ${invitingUser.id} (role: ${invitingUser.role}) is not a member of household ${householdId}. Cannot invite.`,
      );
      throw new HttpException(
        'You must be a member of the household to invite others',
        HttpStatus.FORBIDDEN,
      );
    }

    const existingUserInHousehold = await this.usersService.findOneByEmail(inviteeEmail);
    if (existingUserInHousehold && existingUserInHousehold.householdId === householdId) {
      this.logger.warn(
        `User with email ${inviteeEmail} is already a member of household ${householdId}`,
      );
      throw new ConflictException(
        'This user is already a member of this household',
      );
    }

    const existingPendingInvitation = await this.invitationsRepository.findOne({
      where: {
        email: inviteeEmail.toLowerCase(),
        householdId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingPendingInvitation) {
      this.logger.warn(
        `Pending email invitation already exists for ${inviteeEmail} to household ${householdId}`,
      );
      throw new ConflictException(
        'An email invitation for this user to this household is already pending',
      );
    }

    const token = this.generateToken();
    const expiresInHours = 24 * 7; // Email invitations valid for 7 days
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const newInvitation = this.invitationsRepository.create({
      email: inviteeEmail.toLowerCase(),
      householdId,
      invitedById: invitingUser.id,
      token,
      status: InvitationStatus.PENDING,
      expiresAt,
      shortCode: null, // Explicitly null for email invites
    });

    await this.invitationsRepository.save(newInvitation);
    this.logger.log(`Email invitation created with ID: ${newInvitation.id}`);

    const frontendBaseUrl = this.configService.get<string>('FRONTEND_BASE_URL') || 'http://localhost:3000';
    const invitationLink = `${frontendBaseUrl}/invitations/accept?token=${token}`;

    try {
      await this.mailService.sendEmail(
        newInvitation.email!,
        `You're invited to join ${household.name} on RentMate!`,
        `<p>Hello,</p><p>You have been invited to join the household "${household.name}" on RentMate by ${invitingUser.name || invitingUser.email}.</p><p>Click this link to accept the invitation: <a href="${invitationLink}">${invitationLink}</a></p><p>This link will expire in ${expiresInHours / 24} days.</p><p>If you did not expect this invitation, you can safely ignore this email.</p><p>Thanks,<br/>The RentMate Team</p>`,
        `Hello,\n\nYou have been invited to join the household "${household.name}" on RentMate by ${invitingUser.name || invitingUser.email}.\n\nGo to this link to accept: ${invitationLink}\n\nThis link will expire in ${expiresInHours / 24} days.\n\nIf you did not expect this invitation, you can safely ignore this email.\n\nThanks,\nThe RentMate Team`,
      );
      this.logger.log(`Invitation email sent to ${newInvitation.email}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send invitation email to ${newInvitation.email}. Invitation ID: ${newInvitation.id}`,
        error.stack,
      );
    }
    return newInvitation;
  }

  async createHouseholdShortCodeInvitation(
    householdId: string,
    invitingUser: User,
  ): Promise<Invitation> { // Return the full invitation object including the shortCode
    this.logger.log(
      `Attempting to create SHORT CODE invitation for household ${householdId} by user ${invitingUser.id}`,
    );

    const household = await this.householdsService.findOneById(householdId);
    if (!household) {
      this.logger.warn(`Household not found: ${householdId}`);
      throw new HttpException('Household not found', HttpStatus.NOT_FOUND);
    }

    // Ensure inviter is part of the household (or an admin/owner with rights)
    if (invitingUser.householdId !== householdId && invitingUser.role !== UserRole.OWNER) {
        this.logger.warn(
            `User ${invitingUser.id} (role: ${invitingUser.role}) is not the owner or a member of household ${householdId}. Cannot generate short code.`,
          );
      throw new HttpException(
        'Only household owners or members can generate invitation codes for their household',
        HttpStatus.FORBIDDEN,
      );
    }
    // Stricter: Only owner can generate short codes
    if (invitingUser.role !== UserRole.OWNER && invitingUser.householdId === householdId) {
        // Allow members to generate codes if they are part of the household (less strict)
        // If you want only owners: use this check
        // this.logger.warn(`User ${invitingUser.id} is not an OWNER of household ${householdId}. Cannot generate short code.`);
        // throw new HttpException('Only household owners can generate invitation codes', HttpStatus.FORBIDDEN);
    }

    // Generate a globally unique short code
    const shortCode = await this.generateShortCode(); // No longer pass householdId
    const token = this.generateToken(); // Still generate a main token for internal use / alternative acceptance
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SHORT_CODE_EXPIRES_IN_HOURS);

    const newInvitation = this.invitationsRepository.create({
      // email: null, // For short code invites, email might be null initially
      householdId,
      invitedById: invitingUser.id,
      token, // Main secure token
      shortCode, // The new short code
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    await this.invitationsRepository.save(newInvitation);
    this.logger.log(`Short code invitation created with ID: ${newInvitation.id}, Code: ${shortCode}`);

    return newInvitation; // Includes the shortCode
  }


  async findByToken(token: string): Promise<Invitation | null> {
    return this.invitationsRepository.findOne({ 
      where: { token },
      relations: ['household'], // Ensure household relation is loaded
    });
  }

  async findByShortCode(shortCode: string): Promise<Invitation | null> {
    return this.invitationsRepository.findOne({
        where: {
            shortCode: shortCode.toUpperCase(), 
            status: InvitationStatus.PENDING
        }
    });
  }

  private async processAcceptance(invitation: Invitation, acceptingUserEmail: string): Promise<Household> {
    if (invitation.email && invitation.email.toLowerCase() !== acceptingUserEmail.toLowerCase()) {
        this.logger.warn(
          `Invitation ${invitation.id} is for ${invitation.email}, but user ${acceptingUserEmail} tried to accept.`,
        );
        throw new HttpException('This invitation is for a different email address', HttpStatus.FORBIDDEN);
      }
  
      if (new Date() > invitation.expiresAt) {
        this.logger.warn(`Invitation ${invitation.id} has expired.`);
        invitation.status = InvitationStatus.EXPIRED;
        await this.invitationsRepository.save(invitation);
        throw new HttpException('Invitation has expired', HttpStatus.GONE);
      }
  
      let userToUpdate = await this.usersService.findOneByEmail(acceptingUserEmail);
      if (!userToUpdate) {
        this.logger.warn(`User with email ${acceptingUserEmail} not found during invitation acceptance.`);
        // This case implies the user accepting the invite doesn't exist yet, 
        // which shouldn't happen if they are logged in to accept.
        // If invite acceptance can create users, that logic would go here.
        throw new HttpException('User to accept invitation not found', HttpStatus.INTERNAL_SERVER_ERROR);
      }
  
      if (userToUpdate.householdId) {
        if (userToUpdate.householdId === invitation.householdId) {
          this.logger.warn(`User ${acceptingUserEmail} is already a member of household ${invitation.householdId}.`);
          invitation.status = InvitationStatus.ACCEPTED; // Mark as accepted anyway
          await this.invitationsRepository.save(invitation);
          return invitation.household!;
        } else {
          this.logger.warn(`User ${acceptingUserEmail} is already a member of another household (${userToUpdate.householdId}).`);
          throw new ConflictException(
            'You are already part of another household. Please leave your current household to accept this invitation.',
          );
        }
      }
  
      // Add user to household
      userToUpdate.householdId = invitation.householdId;
      userToUpdate.household = invitation.household; 
      userToUpdate.role = UserRole.MEMBER; 
      await this.usersService.save(userToUpdate);
      this.logger.log(`User ${acceptingUserEmail} added to household ${invitation.householdId}`);
  
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      invitation.acceptedByUserId = userToUpdate.id;
      await this.invitationsRepository.save(invitation);

      this.logger.log(
        `User ${userToUpdate.email} successfully joined household ${invitation.householdId} via invitation ${invitation.id}`,
      );
      
      // Log HOUSEHOLD_MEMBER_ADDED activity
      await this.activityLogService.createLogEntry({
        householdId: invitation.householdId!,
        actorId: userToUpdate.id, // The user who joined is the actor in this context
        entityId: userToUpdate.id, // The user who was added
        entityType: 'User', // Or 'HouseholdMember'
        activityType: ActivityType.HOUSEHOLD_MEMBER_ADDED,
        details: {
          joinedUserId: userToUpdate.id,
          joinedUserName: userToUpdate.name || userToUpdate.email,
          householdName: invitation.household?.name || 'Unknown Household',
          method: invitation.shortCode ? 'shortcode' : 'email_link',
        },
      });

      return invitation.household!;
  }
  
  async acceptInvitationByToken(token: string, acceptingUser: User): Promise<Household> {
    this.logger.log(`User ${acceptingUser.email} attempting to accept invitation by TOKEN ${token}`);
    const invitation = await this.findByToken(token);

    if (!invitation) {
      this.logger.warn(`Token invitation not found: ${token}`);
      throw new HttpException('Invitation not found or invalid', HttpStatus.NOT_FOUND);
    }
    return this.processAcceptance(invitation, acceptingUser.email);
  }

  async acceptInvitationByShortCode(shortCode: string, acceptingUser: User): Promise<Household> {
    this.logger.log(`User ${acceptingUser.email} attempting to accept invitation by SHORT CODE ${shortCode}`);
    const invitation = await this.findByShortCode(shortCode); // No householdId needed

    if (!invitation) {
      this.logger.warn(`Short code invitation not found: ${shortCode}`);
      throw new HttpException('Invitation code not found, invalid, or already used', HttpStatus.NOT_FOUND);
    }
    // The householdId is now derived from the found invitation
    return this.processAcceptance(invitation, acceptingUser.email);
  }

  async declineInvitationByToken(token: string, decliningUser: User): Promise<void> {
    this.logger.log(`User ${decliningUser.email} attempting to DECLINE invitation by TOKEN ${token}`);
    const invitation = await this.findByToken(token);

    if (!invitation) {
      this.logger.warn(`Token invitation not found for decline: ${token}`);
      throw new HttpException('Invitation not found or invalid', HttpStatus.NOT_FOUND);
    }

    // Check if invitation is targeted and if it matches the declining user
    if (invitation.email && invitation.email.toLowerCase() !== decliningUser.email.toLowerCase()) {
      this.logger.warn(
        `Decline attempt: Invitation ${invitation.id} is for ${invitation.email}, but user ${decliningUser.email} tried to decline.`,
      );
      throw new HttpException('This invitation is not for you to decline', HttpStatus.FORBIDDEN);
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      this.logger.warn(`Invitation ${invitation.id} is not pending (status: ${invitation.status}). Cannot decline.`);
      // Could throw an error or just silently succeed if already accepted/declined/expired by another means
      // For now, let's be explicit that it must be pending to be declined via this action.
      throw new HttpException(`Invitation is no longer pending and cannot be declined (current status: ${invitation.status})`, HttpStatus.BAD_REQUEST);
    }

    if (new Date() > invitation.expiresAt) {
      this.logger.warn(`Invitation ${invitation.id} has expired. Marking as EXPIRED instead of DECLINED.`);
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationsRepository.save(invitation);
      // Still throw an error for the user action, as decline implies an active choice on a valid invite
      throw new HttpException('Invitation has expired and cannot be declined', HttpStatus.GONE);
    }

    invitation.status = InvitationStatus.DECLINED;
    await this.invitationsRepository.save(invitation);
    this.logger.log(`Invitation ${invitation.id} marked as DECLINED by user ${decliningUser.email}`);
  }

  async cancelSentInvitation(invitationId: string, cancellingUser: User): Promise<Invitation> {
    this.logger.log(`User ${cancellingUser.id} attempting to CANCEL invitation ${invitationId}`);
    const invitation = await this.invitationsRepository.findOne({ 
      where: { id: invitationId },
      relations: ['household'], // Load household to check ownership if needed
    });

    if (!invitation) {
      this.logger.warn(`Cancel attempt: Invitation ${invitationId} not found.`);
      throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND);
    }

    // Authorization check:
    // User must be the original inviter OR an owner of the household associated with the invitation.
    const isInviter = invitation.invitedById === cancellingUser.id;
    // To check for household ownership, we need to ensure cancellingUser.householdId is set and matches, and their role is OWNER.
    // This assumes the cancellingUser object from JWT includes role and their current householdId.
    const isHouseholdOwner = 
      invitation.householdId === cancellingUser.householdId && 
      cancellingUser.role === UserRole.OWNER;

    if (!isInviter && !isHouseholdOwner) {
      this.logger.warn(
        `User ${cancellingUser.id} is not authorized to cancel invitation ${invitationId}. Inviter: ${invitation.invitedById}, User Role: ${cancellingUser.role}, User Household: ${cancellingUser.householdId}, Invite Household: ${invitation.householdId}`
      );
      throw new HttpException(
        'You are not authorized to cancel this invitation',
        HttpStatus.FORBIDDEN,
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      this.logger.warn(
        `Invitation ${invitationId} is not pending (status: ${invitation.status}). Cannot cancel.`,
      );
      throw new HttpException(
        `Only pending invitations can be cancelled. Current status: ${invitation.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Note: We don't check expiry here. A pending but expired invitation can still be explicitly cancelled.
    // If it was already EXPIRED, the status check above would prevent cancellation.

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationsRepository.save(invitation);
    this.logger.log(`Invitation ${invitationId} marked as CANCELLED by user ${cancellingUser.id}`);
    return invitation;
  }

  async getInvitationDetailsByToken(token: string): Promise<Partial<Invitation> & { householdName?: string }> {
    const invitation = await this.findByToken(token);

    if (!invitation) {
      throw new HttpException('Invitation not found or invalid', HttpStatus.NOT_FOUND);
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new HttpException(`Invitation is no longer valid (status: ${invitation.status})`, HttpStatus.GONE);
    }
    if (new Date() > invitation.expiresAt) {
      throw new HttpException('Invitation has expired', HttpStatus.GONE);
    }

    return {
      householdId: invitation.householdId,
      householdName: invitation.household?.name, // household might be null if relation not loaded without 'household' in find options
      expiresAt: invitation.expiresAt,
      email: invitation.email, // if it was an email invite that also got a short_code (not current logic but possible)
      status: invitation.status
    };
  }

  async getInvitationDetailsByShortCode(shortCode: string): Promise<Partial<Invitation> & { householdName?: string }> {
    const invitation = await this.invitationsRepository.findOne({ 
      where: { shortCode: shortCode.toUpperCase() },
      relations: ['household'] 
    });

    if (!invitation) {
      throw new HttpException('Invitation not found or invalid', HttpStatus.NOT_FOUND);
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new HttpException(`Invitation is no longer valid (status: ${invitation.status})`, HttpStatus.GONE);
    }
    if (new Date() > invitation.expiresAt) {
      throw new HttpException('Invitation has expired', HttpStatus.GONE);
    }

    return {
      householdId: invitation.householdId,
      householdName: invitation.household?.name, // household might be null if relation not loaded without 'household' in find options
      expiresAt: invitation.expiresAt,
      email: invitation.email, // if it was an email invite that also got a short_code (not current logic but possible)
      status: invitation.status
    };
  }

  async getPendingInvitationsForHousehold(householdId: string, requestingUser: User): Promise<Invitation[]> {
    this.logger.log(`User ${requestingUser.id} fetching PENDING invitations for household ${householdId}`);

    // Authorization: Ensure the requesting user is part of the household or an owner
    if (requestingUser.householdId !== householdId || (requestingUser.role !== UserRole.OWNER && requestingUser.role !== UserRole.MEMBER)) {
      // Allowing members to also see pending invites, not just owners. Adjust if only owners should see.
      this.logger.warn(
        `User ${requestingUser.id} (role: ${requestingUser.role}) is not authorized to view pending invitations for household ${householdId}.`,
      );
      throw new HttpException(
        'You are not authorized to view pending invitations for this household',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.invitationsRepository.find({
      where: {
        householdId: householdId,
        status: InvitationStatus.PENDING,
      },
      order: {
        createdAt: 'DESC', // Show newest pending invitations first
      },
      // relations: ['invitedBy'], // Optionally load inviter details if needed for display
    });
  }

  // TODO: Add methods for:
  // - Declining an invitation (both types)
  // - Cancelling an invitation (by inviter, both types)
  // - Listing pending invitations for a household (for household owner/admin view)
  // - Listing pending invitations for a user (my pending invitations)
}

import { Injectable, ConflictException, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Household } from './entities/household.entity';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActivityType } from '../activity-log/entities/activity-log.entity';

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectRepository(Household)
    private householdsRepository: Repository<Household>,
    private usersService: UsersService, // Inject UsersService
    private activityLogService: ActivityLogService, // Inject ActivityLogService
  ) {}

  async create(createHouseholdDto: CreateHouseholdDto, creatingUser: User): Promise<Household> {
    // Check if the user is already in a household
    if (creatingUser.householdId) {
      const existingHousehold = await this.householdsRepository.findOne({ where: { id: creatingUser.householdId } });
      if (existingHousehold) {
          throw new ConflictException(`User is already in household: ${existingHousehold.name}`);
      }
      // If householdId is set but household doesn't exist (data inconsistency), 
      // allow creating a new one, but ideally, this state shouldn't occur.
    }

    const newHouseholdEntity = this.householdsRepository.create({
      ...createHouseholdDto,
      // members: [creatingUser], // Temporarily remove direct member assignment here as TypeORM handles it via user update
    });

    const savedHousehold = await this.householdsRepository.save(newHouseholdEntity);

    // Update the user to assign them to this household and set their role to OWNER
    creatingUser.household = savedHousehold;
    creatingUser.householdId = savedHousehold.id;
    creatingUser.role = UserRole.OWNER; // The creator becomes the owner
    await this.usersService.save(creatingUser); // Add a save method to UsersService

    // Refetch the household with its members relation to ensure it's populated
    const populatedHousehold = await this.householdsRepository.findOne({ 
        where: { id: savedHousehold.id }, 
        relations: ['members'] 
    });

    if (!populatedHousehold) {
      // This should ideally not happen if the save was successful
      throw new InternalServerErrorException('Failed to retrieve household after creation.');
    }

    // Log activity
    await this.activityLogService.createLogEntry({
      householdId: populatedHousehold.id, // The household being acted upon
      actorId: creatingUser.id,
      entityId: populatedHousehold.id, // The entity created
      entityType: 'Household',
      activityType: ActivityType.HOUSEHOLD_CREATED,
      details: { householdName: populatedHousehold.name, ownerUserId: creatingUser.id },
    });

    return populatedHousehold;
  }

  async findOneByIdWithMembers(id: string): Promise<Household | null> {
    const household = await this.householdsRepository.findOne({
      where: { id },
      relations: ['members'], // Eagerly load members
    });
    return household; // Can be null if not found
  }

  async findOneById(id: string): Promise<Household | null> {
    return this.householdsRepository.findOne({ where: { id } });
  }

  async findOneByIdWithMembersAndValidateMembership(householdId: string, userId: User['id']): Promise<Household> {
    const household = await this.householdsRepository.findOne({
      where: { id: householdId },
      relations: ['members'],
    });

    if (!household) {
      throw new NotFoundException(`Household with ID ${householdId} not found.`);
    }

    const isMember = household.members.some(member => member.id === userId);
    if (!isMember) {
      throw new UnauthorizedException(`User ${userId} is not a member of household ${householdId}.`);
    }

    return household;
  }

  async findOneByIdWithRelations(id: string, relations: string[] = []): Promise<Household | null> {
    return this.householdsRepository.findOne({
      where: { id },
      relations,
    });
  }

  async removeMemberFromHousehold(householdId: string, memberUserIdToRemove: string, requestingUser: User): Promise<void> {
    // 1. Verify the requesting user is the OWNER of the household
    if (requestingUser.householdId !== householdId || requestingUser.role !== UserRole.OWNER) {
      throw new UnauthorizedException('Only the household owner can remove members.');
    }

    // 2. Ensure the owner is not trying to remove themselves with this method
    if (requestingUser.id === memberUserIdToRemove) {
      throw new ConflictException('Household owner cannot remove themselves. Use delete household or transfer ownership (not implemented).');
    }

    // 3. Find the member to be removed
    const memberToRemove = await this.usersService.findOneById(memberUserIdToRemove);
    if (!memberToRemove) {
      throw new NotFoundException('User to be removed not found.');
    }

    // 4. Verify the member is actually part of the specified household
    if (memberToRemove.householdId !== householdId) {
      throw new ConflictException('This user is not a member of your household.');
    }

    // 5. Remove the user from the household
    memberToRemove.householdId = null;
    memberToRemove.household = null as any; // TypeORM might need relation explicitly set to null
    // Optional: Reset role if it was household-specific. For now, assume role might be global or reset by other logic.
    // memberToRemove.role = UserRole.MEMBER; // Example: Reset to a default role
    
    await this.usersService.save(memberToRemove);

    // Log activity for member removal
    await this.activityLogService.createLogEntry({
      householdId: householdId, // The household being acted upon
      actorId: requestingUser.id,
      entityId: memberToRemove.id, // The user ID who was removed
      entityType: 'User', // Or 'HouseholdMember' if more specific, but User is fine
      activityType: ActivityType.HOUSEHOLD_MEMBER_REMOVED,
      details: {
        removedUserId: memberToRemove.id,
        removedUserName: memberToRemove.name || memberToRemove.email,
        householdName: (await this.householdsRepository.findOne({ where: { id: householdId } }))?.name || 'Unknown Household',
      },
    });

    // Optional: Add logic here to handle chores, expenses, etc., assigned to the removed user.
  }

  // Placeholder for other household methods like:
  // async findOneById(id: string): Promise<Household | null> { ... }
  // async addUserToHousehold(householdId: string, userId: string): Promise<Household> { ... }
  // async removeUserFromHousehold(householdId: string, userId: string): Promise<Household> { ... }
} 
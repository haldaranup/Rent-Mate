import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Chore, ChoreRecurrence } from './entities/chore.entity';
import { CreateChoreDto } from './dto/create-chore.dto';
import { UpdateChoreDto } from './dto/update-chore.dto';
import { User } from '../users/entities/user.entity';
import { HouseholdsService } from '../households/households.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActivityType } from '../activity-log/entities/activity-log.entity';

@Injectable()
export class ChoresService {
  constructor(
    @InjectRepository(Chore)
    private choresRepository: Repository<Chore>,
    private householdsService: HouseholdsService, // To verify household membership
    private usersService: UsersService, // To verify assignedUser if provided
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    createChoreDto: CreateChoreDto,
    creatingUser: User,
  ): Promise<Chore> {
    if (!creatingUser.householdId) {
      throw new BadRequestException(
        'User must belong to a household to create chores.',
      );
    }

    if (createChoreDto.assignedToId) {
      const assignedUser = await this.usersService.findOneById(
        createChoreDto.assignedToId,
      );
      if (
        !assignedUser ||
        assignedUser.householdId !== creatingUser.householdId
      ) {
        throw new BadRequestException(
          'Assigned user not found or does not belong to the same household.',
        );
      }
    }

    const choreToCreate = {
      ...createChoreDto,
      householdId: creatingUser.householdId,
      dueDate: createChoreDto.dueDate
        ? new Date(createChoreDto.dueDate)
        : undefined,
    };

    const savedChore = await this.choresRepository.save(
      this.choresRepository.create(choreToCreate),
    );

    // Log activity
    await this.activityLogService.createLogEntry({
      householdId: savedChore.householdId,
      actorId: creatingUser.id,
      entityId: savedChore.id,
      entityType: 'Chore',
      activityType: ActivityType.CHORE_CREATED,
      details: {
        description: savedChore.description,
        assignedToId: savedChore.assignedToId,
        dueDate: savedChore.dueDate,
      },
    });

    return savedChore;
  }

  async findAllForHousehold(householdId: string, user: User): Promise<Chore[]> {
    if (user.householdId !== householdId) {
      throw new UnauthorizedException(
        'You can only view chores for your own household.',
      );
    }
    return this.choresRepository.find({
      where: { householdId },
      relations: ['assignedTo', 'completedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Chore> {
    const chore = await this.choresRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'completedBy', 'household'],
    });

    if (!chore) {
      throw new NotFoundException(`Chore with ID "${id}" not found.`);
    }
    if (chore.householdId !== user.householdId) {
      throw new UnauthorizedException(
        'You do not have permission to view this chore.',
      );
    }
    return chore;
  }

  async update(
    id: string,
    updateChoreDto: UpdateChoreDto,
    user: User,
  ): Promise<Chore> {
    const chore = await this.findOne(id, user);
    const originalChoreState = { ...chore }; // Shallow copy for logging

    const logDetails: Record<string, any> = {};
    let activityTypeToLog: ActivityType | null = null;

    // Handle assignment changes
    if (updateChoreDto.assignedToId !== undefined) {
      if (updateChoreDto.assignedToId === null && chore.assignedToId !== null) {
        chore.assignedToId = null;
        chore.assignedTo = null;
        activityTypeToLog = ActivityType.CHORE_UNASSIGNED;
        logDetails.unassignedFrom = originalChoreState.assignedToId;
      } else if (
        updateChoreDto.assignedToId &&
        updateChoreDto.assignedToId !== chore.assignedToId
      ) {
        const assignedUser = await this.usersService.findOneById(
          updateChoreDto.assignedToId,
        );
        if (!assignedUser || assignedUser.householdId !== user.householdId) {
          throw new BadRequestException(
            'Assigned user not found or does not belong to the same household.',
          );
        }
        chore.assignedToId = assignedUser.id;
        chore.assignedTo = assignedUser;
        activityTypeToLog = ActivityType.CHORE_ASSIGNED;
        logDetails.assignedTo = assignedUser.id;
        if (originalChoreState.assignedToId)
          logDetails.previouslyAssignedTo = originalChoreState.assignedToId;
      }
    }

    // Handle due date changes
    if (updateChoreDto.dueDate !== undefined) {
      const newDueDate = updateChoreDto.dueDate
        ? new Date(updateChoreDto.dueDate)
        : null;
      if (newDueDate?.toISOString() !== chore.dueDate?.toISOString()) {
        logDetails.dueDateChanged = { old: chore.dueDate, new: newDueDate };
        chore.dueDate = newDueDate;
        if (!activityTypeToLog) activityTypeToLog = ActivityType.CHORE_UPDATED;
      }
    }

    // Handle completion status changes
    if (
      updateChoreDto.isComplete !== undefined &&
      updateChoreDto.isComplete !== chore.isComplete
    ) {
      if (updateChoreDto.isComplete) {
        if (chore.recurrence && chore.recurrence !== ChoreRecurrence.NONE) {
          // Rotation handles its own completion logging for the *current* cycle
          // So, this update() call will just trigger rotation
          const rotatedChore = await this.completeAndRotateChore(chore, user);
          // Log that an update triggered a completion/rotation for clarity, if needed
          await this.activityLogService.createLogEntry({
            householdId: chore.householdId,
            actorId: user.id,
            entityId: chore.id, // Log against the original chore ID that was completed
            entityType: 'Chore',
            activityType: ActivityType.CHORE_COMPLETED, // Logging completion from update context
            details: {
              via: 'update',
              description: chore.description,
              completedBy: user.id,
            },
          });
          return rotatedChore;
        } else {
          chore.isComplete = true;
          chore.completedById = user.id;
          chore.completedAt = new Date();
          activityTypeToLog = ActivityType.CHORE_COMPLETED;
          logDetails.completedBy = user.id;
        }
      } else {
        if (
          user.role !== UserRole.OWNER &&
          chore.completedById !== user.id &&
          chore.completedById !== null
        ) {
          throw new ForbiddenException(
            'Only the household owner or the user who completed the chore can mark it as incomplete.',
          );
        }
        chore.isComplete = false;
        chore.completedById = null;
        chore.completedAt = null;
        activityTypeToLog = ActivityType.CHORE_UPDATED; // Or CHORE_UNCOMPLETED
        logDetails.uncompletedBy = user.id;
        logDetails.wasCompletedAt = originalChoreState.completedAt;
      }
    }
    // No explicit 'else if' for already completed recurring chores here, rotation is handled by state transition.

    // Handle other updatable fields
    if (
      updateChoreDto.description &&
      updateChoreDto.description !== chore.description
    ) {
      logDetails.descriptionChanged = {
        old: chore.description,
        new: updateChoreDto.description,
      };
      chore.description = updateChoreDto.description;
      if (!activityTypeToLog) activityTypeToLog = ActivityType.CHORE_UPDATED;
    }
    if (
      updateChoreDto.notes !== undefined &&
      updateChoreDto.notes !== chore.notes
    ) {
      logDetails.notesChanged = { old: chore.notes, new: updateChoreDto.notes };
      chore.notes = updateChoreDto.notes;
      if (!activityTypeToLog) activityTypeToLog = ActivityType.CHORE_UPDATED;
    }
    if (
      updateChoreDto.recurrence &&
      updateChoreDto.recurrence !== chore.recurrence
    ) {
      logDetails.recurrenceChanged = {
        old: chore.recurrence,
        new: updateChoreDto.recurrence,
      };
      chore.recurrence = updateChoreDto.recurrence;
      if (!activityTypeToLog) activityTypeToLog = ActivityType.CHORE_UPDATED;
    }

    const updatedChore = await this.choresRepository.save(chore);

    if (activityTypeToLog) {
      await this.activityLogService.createLogEntry({
        householdId: updatedChore.householdId,
        actorId: user.id,
        entityId: updatedChore.id,
        entityType: 'Chore',
        activityType: activityTypeToLog,
        details: { ...logDetails, description: updatedChore.description },
      });
    }

    return updatedChore;
  }

  private async completeAndRotateChore(
    chore: Chore,
    completingUser: User,
  ): Promise<Chore> {
    const originalChoreId = chore.id; // For logging original completion
    const originalChoreDescription = chore.description;

    if (!chore.householdId)
      throw new BadRequestException(
        'Chore is not associated with a household.',
      );
    const household = await this.householdsService.findOneByIdWithMembers(
      chore.householdId,
    );
    if (!household || !household.members || household.members.length === 0) {
      chore.isComplete = true;
      chore.completedById = completingUser.id;
      chore.completedAt = new Date();
      const nonRotatedChore = await this.choresRepository.save(chore);
      // Log completion for non-rotated chore
      await this.activityLogService.createLogEntry({
        householdId: nonRotatedChore.householdId,
        actorId: completingUser.id,
        entityId: nonRotatedChore.id,
        entityType: 'Chore',
        activityType: ActivityType.CHORE_COMPLETED,
        details: {
          description: nonRotatedChore.description,
          completedBy: completingUser.id,
          note: 'Not rotated, no members.',
        },
      });
      return nonRotatedChore;
    }
    const members = household.members.sort((a, b) => a.id.localeCompare(b.id));

    let nextAssigneeId: string | null = null;
    if (members.length > 0) {
      const currentAssigneeIndex = chore.assignedToId
        ? members.findIndex((m) => m.id === chore.assignedToId)
        : -1;
      const nextAssignee = members[(currentAssigneeIndex + 1) % members.length];
      nextAssigneeId = nextAssignee.id;
    }

    const lastEffectiveDate = chore.dueDate || chore.completedAt || new Date();
    let nextDueDate: Date | null = null;
    switch (chore.recurrence) {
      case ChoreRecurrence.DAILY:
        nextDueDate = addDays(lastEffectiveDate, 1);
        break;
      case ChoreRecurrence.WEEKLY:
        nextDueDate = addWeeks(lastEffectiveDate, 1);
        break;
      case ChoreRecurrence.BI_WEEKLY:
        nextDueDate = addWeeks(lastEffectiveDate, 2);
        break;
      case ChoreRecurrence.MONTHLY:
        nextDueDate = addMonths(lastEffectiveDate, 1);
        break;
      default:
        nextDueDate = chore.dueDate;
        break;
    }

    // Log completion of the *current* instance of the chore *before* updating it for the next cycle
    await this.activityLogService.createLogEntry({
      householdId: chore.householdId,
      actorId: completingUser.id,
      entityId: originalChoreId, // Use original ID for the completed instance
      entityType: 'Chore',
      activityType: ActivityType.CHORE_COMPLETED,
      details: {
        description: originalChoreDescription,
        completedBy: completingUser.id,
        recurrence: chore.recurrence,
      },
    });

    chore.isComplete = false;
    chore.completedById = null;
    chore.completedAt = null;
    const previousAssigneeId = chore.assignedToId;
    chore.assignedToId = nextAssigneeId;
    chore.assignedTo = members.find((m) => m.id === nextAssigneeId) || null;
    chore.dueDate = nextDueDate;

    const rotatedChore = await this.choresRepository.save(chore);

    // Log rotation/re-assignment
    await this.activityLogService.createLogEntry({
      householdId: rotatedChore.householdId,
      actorId: null, // System action
      entityId: rotatedChore.id,
      entityType: 'Chore',
      activityType: ActivityType.CHORE_ROTATED,
      details: {
        description: rotatedChore.description,
        newDueDate: rotatedChore.dueDate,
        newlyAssignedTo: rotatedChore.assignedToId,
        previouslyAssignedTo: previousAssigneeId,
        recurrence: rotatedChore.recurrence,
      },
    });

    return rotatedChore;
  }

  async toggleComplete(id: string, user: User): Promise<Chore> {
    const chore = await this.findOne(id, user); // Original chore state
    let activityTypeToLog: ActivityType;
    const logDetails: Record<string, any> = { description: chore.description };

    if (chore.isComplete) {
      if (
        user.role !== UserRole.OWNER &&
        chore.completedById !== user.id &&
        chore.completedById !== null
      ) {
        throw new ForbiddenException(
          'Only the household owner or the user who completed the chore can mark it as incomplete.',
        );
      }
      chore.isComplete = false;
      chore.completedById = null;
      chore.completedAt = null;
      activityTypeToLog = ActivityType.CHORE_UPDATED; // Or CHORE_UNCOMPLETED
      logDetails.uncompletedBy = user.id;
      logDetails.statusChange = 'Marked as incomplete';
    } else {
      if (chore.recurrence && chore.recurrence !== ChoreRecurrence.NONE) {
        // completeAndRotateChore handles its own specific logging for completion and rotation
        return this.completeAndRotateChore(chore, user);
      } else {
        chore.isComplete = true;
        chore.completedById = user.id;
        chore.completedAt = new Date();
        activityTypeToLog = ActivityType.CHORE_COMPLETED;
        logDetails.completedBy = user.id;
        logDetails.statusChange = 'Marked as complete';
      }
    }
    const updatedChore = await this.choresRepository.save(chore);

    await this.activityLogService.createLogEntry({
      householdId: updatedChore.householdId,
      actorId: user.id,
      entityId: updatedChore.id,
      entityType: 'Chore',
      activityType: activityTypeToLog,
      details: logDetails,
    });

    return updatedChore;
  }

  async remove(id: string, user: User): Promise<void> {
    const chore = await this.findOne(id, user); // Ensures chore exists and user has permission

    // Store chore details for logging before deletion
    const choreId = chore.id;
    const choreDescription = chore.description;
    const choreHouseholdId = chore.householdId;

    await this.choresRepository.remove(chore);

    // Log activity
    await this.activityLogService.createLogEntry({
      householdId: choreHouseholdId, // Use stored householdId
      actorId: user.id,
      entityId: choreId, // Use stored choreId of the deleted chore
      entityType: 'Chore',
      activityType: ActivityType.CHORE_DELETED,
      details: { description: choreDescription }, // Use stored description
    });
  }

  async getChoreCounts(
    householdId: string,
    user: User,
  ): Promise<{ total: number; completed: number; pending: number }> {
    if (user.householdId !== householdId) {
      throw new UnauthorizedException(
        'Cannot get chore counts for this household.',
      );
    }
    const total = await this.choresRepository.count({ where: { householdId } });
    const completed = await this.choresRepository.count({
      where: { householdId, isComplete: true },
    });
    return { total, completed, pending: total - completed };
  }

  async getAssignedChoresForUser(
    userId: string,
    requestingUser: User,
  ): Promise<Chore[]> {
    if (
      userId !== requestingUser.id &&
      requestingUser.role !== UserRole.OWNER
    ) {
      throw new ForbiddenException(
        'You can only view your own assigned chores or all if you are an owner.',
      );
    }
    const targetUser = await this.usersService.findOneById(userId);
    if (
      !targetUser ||
      !targetUser.householdId ||
      targetUser.householdId !== requestingUser.householdId
    ) {
      throw new NotFoundException('Target user not found in your household.');
    }
    const householdId = requestingUser.householdId as string;
    return this.choresRepository.find({
      where: { assignedToId: userId, householdId: householdId },
      relations: ['assignedTo', 'completedBy', 'household'],
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async getUnassignedChores(householdId: string, user: User): Promise<Chore[]> {
    if (user.householdId !== householdId) {
      throw new UnauthorizedException(
        'Cannot view unassigned chores for this household.',
      );
    }
    return this.choresRepository.find({
      where: { householdId, assignedToId: IsNull() },
      relations: ['completedBy', 'household'],
      order: { createdAt: 'DESC' },
    });
  }
}

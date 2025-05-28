import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseShare } from './entities/expense-share.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User } from '../users/entities/user.entity';
import { HouseholdsService } from '../households/households.service';
import { UsersService } from '../users/users.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ActivityType } from '../activity-log/entities/activity-log.entity';

// Define an interface for the balance result
export interface UserBalance {
  userId: string;
  name: string;
  email: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface SettleUpSuggestion {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(ExpenseShare)
    private expenseSharesRepository: Repository<ExpenseShare>,
    private householdsService: HouseholdsService,
    private usersService: UsersService,
    private dataSource: DataSource, // For transactions
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    createExpenseDto: CreateExpenseDto,
    creatingUser: User,
  ): Promise<Expense> {
    const { paidById, shares, amount, description, date } = createExpenseDto; // Removed householdId from here

    if (!creatingUser.householdId) {
      throw new ForbiddenException(
        'You must belong to a household to create an expense.',
      );
    }
    const householdId = creatingUser.householdId; // Use user's householdId

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate household and creating user membership
      //    The householdId now comes from the user, so we fetch it directly.
      //    The creatingUser is inherently a member of their own householdId.
      const household =
        await this.householdsService.findOneByIdWithMembers(householdId);
      if (!household) {
        // This case should ideally not be hit if user.householdId is always valid
        throw new NotFoundException(
          `Household with ID ${householdId} not found.`,
        );
      }
      // No need to check creatingUser membership if householdId comes from creatingUser

      // 2. Validate paidBy user
      let paidByUser: User | undefined = undefined;
      // Ensure paidById is a member of the *user's* household
      if (paidById) {
        paidByUser = household.members.find((member) => member.id === paidById);
        if (!paidByUser) {
          throw new BadRequestException(
            `User specified as payer with ID ${paidById} is not a member of your household or does not exist.`,
          );
        }
      } else {
        throw new BadRequestException('paidById is required.'); // Or handle differently if payer can be null
      }

      // 3. Validate users in shares and sum of share amounts
      let totalSharesAmount = 0;
      if (!shares || shares.length === 0) {
        throw new BadRequestException(
          'Expense shares must be provided and cannot be empty.',
        );
      }

      for (const shareDto of shares) {
        // Ensure owedById from shareDto is a member of the user's household
        const shareUser = household.members.find(
          (member) => member.id === shareDto.owedById,
        );
        if (!shareUser) {
          throw new BadRequestException(
            `User with ID ${shareDto.owedById} in shares is not a member of your household or does not exist.`,
          );
        }
        totalSharesAmount += Number(shareDto.amountOwed);
      }

      const tolerance = 0.001;
      if (Math.abs(totalSharesAmount - Number(amount)) > tolerance) {
        throw new BadRequestException(
          `Sum of share amounts (${totalSharesAmount.toFixed(2)}) does not match total expense amount (${Number(amount).toFixed(2)}).`,
        );
      }

      // 4. Create Expense
      const expense = this.expensesRepository.create({
        description,
        date, // from createExpenseDto
        amount: Number(amount),
        household, // household object from validation
        householdId, // user's householdId
        paidBy: paidByUser, // user object from validation
        paidById: paidById, // from createExpenseDto
      });
      const savedExpense = await queryRunner.manager.save(expense);

      // 5. Create ExpenseShares
      const expenseSharesEntities: ExpenseShare[] = [];
      for (const shareDto of shares) {
        const share = this.expenseSharesRepository.create({
          expense: savedExpense,
          expenseId: savedExpense.id,
          owedById: shareDto.owedById, // Use owedById from DTO
          amountOwed: Number(shareDto.amountOwed), // Use amountOwed from DTO
          // Automatically settled if payer is the one owing this specific share
          isSettled: paidById === shareDto.owedById,
        });
        expenseSharesEntities.push(await queryRunner.manager.save(share));
      }
      savedExpense.shares = expenseSharesEntities;

      await queryRunner.commitTransaction();

      // Log activity
      await this.activityLogService.createLogEntry({
        householdId: savedExpense.householdId,
        actorId: creatingUser.id,
        entityId: savedExpense.id,
        entityType: 'Expense',
        activityType: ActivityType.EXPENSE_CREATED,
        details: {
          description: savedExpense.description,
          amount: savedExpense.amount,
          paidById: savedExpense.paidById,
          numShares: savedExpense.shares.length,
        },
      });

      return savedExpense;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error creating expense:', error);
      throw new InternalServerErrorException('Failed to create expense.');
    } finally {
      await queryRunner.release();
    }
  }

  async findAllForUserHousehold(requestingUser: User): Promise<Expense[]> {
    if (!requestingUser.householdId) {
      // This check might be redundant if controller already checks, but good for service layer integrity
      throw new ForbiddenException('User does not belong to a household.');
    }
    const householdId = requestingUser.householdId;

    // 1. Validate household - already implicitly done by trusting requestingUser.householdId
    //    However, for fetching relations like members, we might still need to fetch the household.
    //    Let's ensure household exists and user is part of it (which should be true if JWT is valid)
    const household =
      await this.householdsService.findOneByIdWithMembers(householdId);
    if (!household) {
      throw new NotFoundException(
        `Household with ID ${householdId} not found. This may indicate data inconsistency.`,
      );
    }
    // Double check user membership for sanity, though householdId comes from user token
    const isUserMember = household.members.some(
      (member) => member.id === requestingUser.id,
    );
    if (!isUserMember) {
      // This should ideally never happen if user.householdId is correctly set from a valid JWT
      throw new ForbiddenException(
        'You are not a member of the household associated with your profile.',
      );
    }

    // 2. Fetch expenses for the user's householdId
    return this.expensesRepository.find({
      where: { householdId }, // Use the derived householdId
      relations: ['paidBy', 'shares', 'shares.owedBy'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(expenseId: string, requestingUser: User): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id: expenseId },
      relations: [
        'household',
        'household.members',
        'paidBy',
        'shares',
        'shares.owedBy',
      ],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${expenseId} not found.`);
    }

    if (!expense.household) {
      // Should not happen if data integrity is maintained
      throw new InternalServerErrorException(
        'Expense is not associated with a household.',
      );
    }

    const isUserMember = expense.household.members.some(
      (member) => member.id === requestingUser.id,
    );
    if (!isUserMember) {
      throw new ForbiddenException(
        'You are not authorized to view this expense.',
      );
    }

    // The household.members field is sensitive and not always needed by the client when fetching one expense.
    // We loaded it for the authorization check. We can remove it before returning if desired.
    // For now, let it be returned; can be optimized later based on specific client needs.
    // delete expense.household.members;

    return expense;
  }

  async update(
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
    user: User,
  ): Promise<Expense> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expense = await queryRunner.manager.findOne(Expense, {
        where: { id: expenseId },
        relations: ['household', 'household.members', 'paidBy', 'shares'],
      });

      if (!expense) {
        throw new NotFoundException(`Expense with ID ${expenseId} not found.`);
      }
      if (!expense.household) {
        throw new InternalServerErrorException(
          'Expense is not associated with a household.',
        );
      }
      if (expense.householdId !== user.householdId) {
        // Check against user's household
        throw new ForbiddenException(
          'You are not authorized to update this expense for this household.',
        );
      }
      // Already checked that user is member of *their* household implicitly by user object having householdId

      const {
        shares: newSharesDto,
        paidById: newPaidById,
        amount: newAmount,
        ...otherUpdates
      } = updateExpenseDto;

      // Update basic fields like description, date
      if (otherUpdates.description !== undefined)
        expense.description = otherUpdates.description;
      if (otherUpdates.date !== undefined) expense.date = otherUpdates.date;

      // Update paidBy if provided
      if (newPaidById !== undefined) {
        if (newPaidById === null) {
          // If you want to allow unsetting the payer.
          // Depending on your logic, you might want to throw an error or handle this case.
          // For now, let's assume paidById is required for an expense, so disallow null.
          // If allowing null, ensure related logic (e.g. shares settlement) is consistent.
          throw new BadRequestException(
            'paidById cannot be null. An expense must have a payer.',
          );
          // expense.paidBy = null;
          // expense.paidById = null;
        } else {
          const paidByUser = expense.household.members.find(
            (member) => member.id === newPaidById,
          );
          if (!paidByUser) {
            throw new BadRequestException(
              `New payer with ID ${newPaidById} is not a member of this household or does not exist.`,
            );
          }
          expense.paidBy = paidByUser;
          expense.paidById = paidByUser.id;
        }
      }

      // Update amount if provided
      // The actual expense.amount will be used if newAmount is not in DTO
      const currentExpenseAmount =
        newAmount !== undefined ? Number(newAmount) : expense.amount;
      if (newAmount !== undefined) {
        expense.amount = Number(newAmount);
      }

      // If shares are provided, replace existing ones
      if (newSharesDto) {
        // Check if shares array is part of the DTO (even if empty)
        if (newSharesDto.length === 0) {
          throw new BadRequestException(
            'Expense shares cannot be empty if provided for update.',
          );
        }
        let totalNewSharesAmount = 0;
        for (const shareDto of newSharesDto) {
          const shareUser = expense.household.members.find(
            (m) => m.id === shareDto.owedById,
          );
          if (!shareUser)
            throw new BadRequestException(
              `User with ID ${shareDto.owedById} in shares is not a member of this household or does not exist.`,
            );
          totalNewSharesAmount += Number(shareDto.amountOwed);
        }

        const tolerance = 0.001;
        if (Math.abs(totalNewSharesAmount - currentExpenseAmount) > tolerance) {
          throw new BadRequestException(
            `Sum of new share amounts (${totalNewSharesAmount.toFixed(2)}) does not match total expense amount (${currentExpenseAmount.toFixed(2)}).`,
          );
        }

        // Delete old shares
        if (expense.shares && expense.shares.length > 0) {
          await queryRunner.manager.remove(expense.shares);
        }

        // Create new shares
        const createdShares: ExpenseShare[] = [];
        const effectivePaidById =
          newPaidById !== undefined ? newPaidById : expense.paidById;
        if (!effectivePaidById) {
          // This should not happen if paidById is always required.
          throw new InternalServerErrorException(
            'Cannot determine payer for settling shares.',
          );
        }

        for (const shareDto of newSharesDto) {
          const share = this.expenseSharesRepository.create({
            expenseId: expense.id, // expenseId is already set on the expense object itself
            owedById: shareDto.owedById,
            amountOwed: Number(shareDto.amountOwed),
            isSettled: effectivePaidById === shareDto.owedById,
          });
          createdShares.push(share); // Collect new shares to be saved
        }
        expense.shares = await queryRunner.manager.save(createdShares); // Batch save new shares and assign to expense
      } else if (
        newAmount !== undefined &&
        expense.shares &&
        expense.shares.length > 0
      ) {
        // If only amount is updated, but not shares, we need to ensure existing shares still make sense.
        // This scenario is complex: do we rescale shares? Or error?
        // For now, let's require shares to be re-specified if the total amount changes.
        throw new BadRequestException(
          'If expense amount is updated, new shares must also be provided.',
        );
      }

      // Save the updated expense (with potentially new shares linked)
      const updatedExpenseEntity = await queryRunner.manager.save(expense);
      await queryRunner.commitTransaction();

      // Log activity for expense update
      await this.activityLogService.createLogEntry({
        householdId: updatedExpenseEntity.householdId,
        actorId: user.id,
        entityId: updatedExpenseEntity.id,
        entityType: 'Expense',
        activityType: ActivityType.EXPENSE_UPDATED,
        details: {
          description: updatedExpenseEntity.description,
          amount: updatedExpenseEntity.amount,
          paidById: updatedExpenseEntity.paidById,
          updatedFields: Object.keys(updateExpenseDto), // Log which fields were in the DTO
        },
      });

      // Repopulate relations that might not be fully loaded after save, if necessary
      // For instance, if share.owedBy details are needed by the client.
      // However, the `update` method should return the updated expense as it is in the DB.
      // The `findOne` or `findAll` methods are typically used to fetch with full relations.
      // Let's return the `updatedExpense` and let `findOne` handle full relation loading if client calls it.
      return this.findOne(updatedExpenseEntity.id, user); // Re-fetch to get all relations correctly populated, especially nested ones like shares.owedBy
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error updating expense:', error);
      throw new InternalServerErrorException('Failed to update expense.');
    } finally {
      await queryRunner.release();
    }
  }

  async remove(expenseId: string, requestingUser: User): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expense = await queryRunner.manager.findOne(Expense, {
        where: { id: expenseId },
        relations: ['household', 'household.members', 'shares'], // Load shares to delete them explicitly if needed by DB constraints or for atomicity
      });

      if (!expense) {
        throw new NotFoundException(`Expense with ID ${expenseId} not found.`);
      }

      if (!expense.household) {
        // This case should ideally be prevented by database constraints or logic
        await queryRunner.rollbackTransaction(); // Rollback before throwing as it's an unexpected state
        throw new InternalServerErrorException(
          'Expense is not associated with a household.',
        );
      }

      const isUserMember = expense.household.members.some(
        (member) => member.id === requestingUser.id,
      );
      // Optional: Add role-based check, e.g., only household owner or expense creator can delete
      if (!isUserMember) {
        throw new ForbiddenException(
          'You are not authorized to delete this expense.',
        );
      }

      // If ExpenseShares are not automatically removed by a cascade delete on the Expense entity,
      // they might need to be removed manually first.
      // Given `cascade: true` on Expense.shares and `onDelete: 'CASCADE'` on Expense.household,
      // removing the expense should cascade to shares. If shares also have relations that need cleanup,
      // that needs to be handled by their respective cascade settings or manually here.
      // For direct shares of an expense, TypeORM's cascade on the Expense entity's OneToMany for shares
      // should handle their removal if `cascade: true` includes removal (which it typically does).
      // If `ExpenseShare` had its own relations that don't cascade from `ExpenseShare` itself, or if
      // there are specific lifecycle hooks needed, more direct handling might be necessary.
      // Let's assume cascade works for Expense -> ExpenseShare for now based on common setup.

      await queryRunner.manager.remove(Expense, expense); // This should also remove related shares due to cascade

      await queryRunner.commitTransaction();

      // Log activity
      await this.activityLogService.createLogEntry({
        householdId: expense.householdId,
        actorId: requestingUser.id,
        entityId: expense.id,
        entityType: 'Expense',
        activityType: ActivityType.EXPENSE_DELETED,
        details: { description: expense.description, amount: expense.amount },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error deleting expense:', error);
      throw new InternalServerErrorException('Failed to delete expense.');
    } finally {
      await queryRunner.release();
    }
  }

  // TODO: Implement other service methods
  // settleShare, etc.

  async toggleExpenseShareSettlement(
    shareId: string,
    settle: boolean, // true to settle, false to unsettle
    requestingUser: User,
  ): Promise<ExpenseShare> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expenseShare = await queryRunner.manager.findOne(ExpenseShare, {
        where: { id: shareId },
        relations: [
          'expense',
          'expense.paidBy',
          'expense.household',
          'expense.household.members',
          'owedBy',
        ],
      });

      if (!expenseShare) {
        throw new NotFoundException(
          `Expense share with ID ${shareId} not found.`,
        );
      }

      if (!expenseShare.expense) {
        // This should ideally not happen due to database integrity
        throw new InternalServerErrorException(
          'Expense share is not associated with a parent expense.',
        );
      }

      // Ensure the expense has a payer defined.
      // expense.paidById is already validated to exist when expense is created/updated.
      if (!expenseShare.expense.paidById) {
        throw new InternalServerErrorException(
          'Parent expense does not have a payer defined. Cannot manage settlement.',
        );
      }

      // Authorization: Only the user who paid for the overall expense can settle/unsettle its shares.
      if (expenseShare.expense.paidById !== requestingUser.id) {
        throw new ForbiddenException(
          'You are not authorized to settle or unsettle this expense share. Only the original payer can.',
        );
      }

      // Prevent settling a share that is owed by the payer themselves, as it's auto-settled on creation.
      // However, they should be able to "unsettle" it if needed (e.g. mistake).
      if (settle && expenseShare.owedById === expenseShare.expense.paidById) {
        // This state should ideally be managed by the initial creation logic (auto-settled if payer owes self)
        // If trying to settle an already auto-settled share, it's redundant but not harmful.
        // If for some reason it was "unsettled" and they want to "re-settle", this check might be too strict.
        // For now, let's allow explicit settlement even if it's the payer's own share.
        // The `isSettled` status on creation already handles the auto-settling.
      }

      expenseShare.isSettled = settle;
      expenseShare.settledAt = settle ? new Date() : null;
      const updatedShare = await queryRunner.manager.save(expenseShare);

      await queryRunner.commitTransaction();

      // Log activity
      await this.activityLogService.createLogEntry({
        householdId: expenseShare.expense.householdId,
        actorId: requestingUser.id,
        entityId: expenseShare.id,
        entityType: 'ExpenseShare',
        activityType: settle
          ? ActivityType.EXPENSE_SHARE_SETTLED
          : ActivityType.EXPENSE_SHARE_UNSETTLED,
        details: {
          expenseDescription: expenseShare.expense.description,
          expenseId: expenseShare.expenseId,
          owedByUserId: expenseShare.owedById,
          owedByUserName:
            expenseShare.owedBy?.name || expenseShare.owedBy?.email,
          amount: expenseShare.amountOwed,
        },
      });

      return updatedShare;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error toggling expense share settlement:', error);
      throw new InternalServerErrorException(
        'Failed to update expense share settlement status.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getHouseholdBalances(
    householdId: string,
    requestingUser: User,
  ): Promise<UserBalance[]> {
    const household =
      await this.householdsService.findOneByIdWithMembersAndValidateMembership(
        householdId,
        requestingUser.id,
      );

    const userBalances: UserBalance[] = [];

    for (const member of household.members) {
      // Calculate total amount paid by this member for expenses in this household
      const paidExpenses = await this.expensesRepository.find({
        where: { paidById: member.id, householdId: household.id },
      });
      const totalPaid = paidExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0,
      );

      // Calculate total amount this member owes from expense shares in this household that are not settled
      const owedShares = await this.expenseSharesRepository.find({
        where: {
          owedById: member.id,
          isSettled: false,
          expense: { householdId: household.id },
        },
        relations: ['expense'], // ensure expense relation is loaded for householdId check
      });
      const totalOwed = owedShares.reduce(
        (sum, share) => sum + Number(share.amountOwed),
        0,
      );

      userBalances.push({
        userId: member.id,
        name: member.name || member.email, // Fallback to email if name is not set
        email: member.email,
        totalPaid,
        totalOwed,
        netBalance: totalPaid - totalOwed,
      });
    }
    return userBalances;
  }

  async getSettleUpSuggestions(
    householdId: string,
    requestingUser: User,
  ): Promise<SettleUpSuggestion[]> {
    const balances = await this.getHouseholdBalances(
      householdId,
      requestingUser,
    );
    if (balances.length === 0) {
      return [];
    }

    const suggestions: SettleUpSuggestion[] = [];

    // Clone balances to modify them, and filter out those with zero net balance
    const debtors = balances
      .filter((b) => b.netBalance < 0)
      .map((b) => ({ ...b, netBalance: Math.abs(b.netBalance) })) // Store absolute amount for debtors
      .sort((a, b) => b.netBalance - a.netBalance); // Sort descending by amount owed

    const creditors = balances
      .filter((b) => b.netBalance > 0)
      .map((b) => ({ ...b })) // Simple clone
      .sort((a, b) => b.netBalance - a.netBalance); // Sort descending by amount due

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      const amountToSettle = Math.min(debtor.netBalance, creditor.netBalance);

      if (amountToSettle > 0.001) {
        // Only add suggestion if amount is significant
        suggestions.push({
          fromUserId: debtor.userId,
          fromUserName: debtor.name,
          toUserId: creditor.userId,
          toUserName: creditor.name,
          amount: parseFloat(amountToSettle.toFixed(2)), // Ensure 2 decimal places
        });

        debtor.netBalance -= amountToSettle;
        creditor.netBalance -= amountToSettle;
      }

      if (debtor.netBalance < 0.001) {
        // Debtor is settled
        debtorIndex++;
      }
      if (creditor.netBalance < 0.001) {
        // Creditor is settled
        creditorIndex++;
      }
    }
    return suggestions;
  }
}

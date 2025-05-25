import { Test, TestingModule } from '@nestjs/testing';
import { ChoresService } from './chores.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Chore, ChoreRecurrence } from './entities/chore.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Household } from '../households/entities/household.entity';
import { HouseholdsService } from '../households/households.service';
import { UsersService } from '../users/users.service';
import { Repository } from 'typeorm';
import { CreateChoreDto } from './dto/create-chore.dto';
import { NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';

// Mock data
const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  role: UserRole.MEMBER,
  householdId: 'household-id-1',
  household: null, // Will be populated in mockHousehold
  assignedChores: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHousehold: Household = {
  id: 'household-id-1',
  name: 'Test Household',
  members: [mockUser],
  chores: [],
  expenses: [],
  invitations: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
// Link user to household
mockUser.household = mockHousehold;

const mockChore: Chore = {
  id: 'chore-id-1',
  title: 'Test Chore',
  description: 'Test description',
  householdId: mockHousehold.id,
  household: mockHousehold,
  isCompleted: false,
  recurrence: ChoreRecurrence.NONE,
  createdById: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

type MockRepository<T extends object = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends object = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  // Add other methods as needed
});

describe('ChoresService', () => {
  let service: ChoresService;
  let choreRepository: MockRepository<Chore>;
  let householdsService: Partial<HouseholdsService>;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    householdsService = {
      findOneByIdWithMembers: jest.fn(),
    };
    usersService = {
      findOneById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChoresService,
        {
          provide: getRepositoryToken(Chore),
          useValue: createMockRepository<Chore>(),
        },
        {
          provide: HouseholdsService,
          useValue: householdsService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    service = module.get<ChoresService>(ChoresService);
    choreRepository = module.get<MockRepository<Chore>>(getRepositoryToken(Chore));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createChoreDto: CreateChoreDto = {
      title: 'New Chore',
      description: 'A new chore to do',
      householdId: mockHousehold.id,
      recurrence: ChoreRecurrence.WEEKLY,
      dueDate: new Date().toISOString(),
    };

    it('should successfully create a chore', async () => {
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(mockHousehold);
      (usersService.findOneById as jest.Mock).mockResolvedValue(undefined); // No assigned user in this case
      
      const expectedChore = {
        ...mockChore, // Spread some defaults
        ...createChoreDto,
        dueDate: new Date(createChoreDto.dueDate!),
        household: mockHousehold,
        createdById: mockUser.id,
        assignedUser: undefined,
        assignedUserId: undefined,
      };
      choreRepository.create!.mockReturnValue(expectedChore as any); // Type assertion for mock
      choreRepository.save!.mockResolvedValue(expectedChore as any);

      const result = await service.create(createChoreDto, mockUser);

      expect(householdsService.findOneByIdWithMembers).toHaveBeenCalledWith(createChoreDto.householdId);
      expect(choreRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        title: createChoreDto.title,
        householdId: mockHousehold.id,
        createdById: mockUser.id,
      }));
      expect(choreRepository.save).toHaveBeenCalledWith(expectedChore);
      expect(result).toEqual(expectedChore);
    });

    it('should throw NotFoundException if household does not exist', async () => {
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createChoreDto, mockUser))
        .rejects.toThrow(NotFoundException);
      expect(householdsService.findOneByIdWithMembers).toHaveBeenCalledWith(createChoreDto.householdId);
    });

    it('should throw ForbiddenException if creating user is not a member of the household', async () => {
      const anotherUser = { ...mockUser, id: 'user-id-2', householdId: 'other-household' };
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(mockHousehold); // Household exists

      await expect(service.create(createChoreDto, anotherUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('should successfully create a chore with an assigned user', async () => {
      const assignedUser = { ...mockUser, id: 'assigned-user-id' };
      const householdWithAssignedMember = { ...mockHousehold, members: [mockUser, assignedUser] };
      const dtoWithAssignedUser: CreateChoreDto = {
        ...createChoreDto,
        assignedUserId: assignedUser.id,
      };

      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(householdWithAssignedMember);
      (usersService.findOneById as jest.Mock).mockResolvedValue(assignedUser);

      const expectedChore = {
        ...mockChore,
        ...dtoWithAssignedUser,
        dueDate: new Date(dtoWithAssignedUser.dueDate!),
        household: householdWithAssignedMember,
        createdById: mockUser.id,
        assignedUser: assignedUser,
        assignedUserId: assignedUser.id,
      };
      choreRepository.create!.mockReturnValue(expectedChore as any);
      choreRepository.save!.mockResolvedValue(expectedChore as any);

      const result = await service.create(dtoWithAssignedUser, mockUser);

      expect(usersService.findOneById).toHaveBeenCalledWith(assignedUser.id);
      expect(result.assignedUser).toEqual(assignedUser);
      expect(result.assignedUserId).toEqual(assignedUser.id);
    });

    it('should throw NotFoundException if assigned user does not exist', async () => {
      const dtoWithNonExistingAssignedUser: CreateChoreDto = {
        ...createChoreDto,
        assignedUserId: 'non-existing-user-id',
      };
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(mockHousehold);
      (usersService.findOneById as jest.Mock).mockResolvedValue(null);

      await expect(service.create(dtoWithNonExistingAssignedUser, mockUser))
        .rejects.toThrow(NotFoundException);
      expect(usersService.findOneById).toHaveBeenCalledWith('non-existing-user-id');
    });

    it('should throw ForbiddenException if assigned user is not a member of the household', async () => {
      const notMemberUser = { id: 'not-member-user-id', email: 'not@member.com' } as User;
      const dtoWithNotMemberAssignedUser: CreateChoreDto = {
        ...createChoreDto,
        assignedUserId: notMemberUser.id,
      };
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(mockHousehold); // Current user is member
      (usersService.findOneById as jest.Mock).mockResolvedValue(notMemberUser); // Assigned user exists

      // mockHousehold.members does not contain notMemberUser
      await expect(service.create(dtoWithNotMemberAssignedUser, mockUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByHousehold', () => {
    it('should return chores for a household if user is a member', async () => {
      const choresList = [mockChore, { ...mockChore, id: 'chore-id-2' }];
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(mockHousehold);
      choreRepository.find!.mockResolvedValue(choresList);

      const result = await service.findAllByHousehold(mockHousehold.id, mockUser);

      expect(householdsService.findOneByIdWithMembers).toHaveBeenCalledWith(mockHousehold.id);
      expect(choreRepository.find).toHaveBeenCalledWith({
        where: { householdId: mockHousehold.id },
        relations: ['assignedUser'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(choresList);
    });

    it('should throw NotFoundException if household does not exist', async () => {
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(null);

      await expect(service.findAllByHousehold('non-existent-household', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a member of the household', async () => {
      const anotherUser = { ...mockUser, id: 'user-id-2' };
      (householdsService.findOneByIdWithMembers as jest.Mock).mockResolvedValue(mockHousehold); // Household exists

      await expect(service.findAllByHousehold(mockHousehold.id, anotherUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleCompletion', () => {
    it('should successfully toggle chore completion status', async () => {
      const initialChore = { ...mockChore, isCompleted: false, household: mockHousehold };
      choreRepository.findOne!.mockResolvedValue(initialChore);
      choreRepository.save!.mockImplementation(async (choreToSave) => choreToSave); // Echo back the saved chore

      const result = await service.toggleCompletion(mockChore.id, mockUser);

      expect(choreRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockChore.id },
        relations: ['household', 'household.members', 'assignedUser'],
      });
      expect(choreRepository.save).toHaveBeenCalledWith({ ...initialChore, isCompleted: true });
      expect(result.isCompleted).toBe(true);

      // Toggle back
      initialChore.isCompleted = true; // Simulate it was saved as true
      choreRepository.findOne!.mockResolvedValue(initialChore); // Next findOne call gets the updated chore
      const result2 = await service.toggleCompletion(mockChore.id, mockUser);
      expect(choreRepository.save).toHaveBeenCalledWith({ ...initialChore, isCompleted: false });
      expect(result2.isCompleted).toBe(false);
    });

    it('should throw NotFoundException if chore does not exist', async () => {
      choreRepository.findOne!.mockResolvedValue(null);
      await expect(service.toggleCompletion('non-existent-chore', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException if chore has no household', async () => {
      const choreWithoutHousehold = { ...mockChore, household: null };
      choreRepository.findOne!.mockResolvedValue(choreWithoutHousehold);
      await expect(service.toggleCompletion(mockChore.id, mockUser))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('should throw ForbiddenException if user is not a member of the chore\'s household', async () => {
      const anotherUser = { ...mockUser, id: 'user-id-2' }; // Not in mockHousehold.members by default
      const choreWithHousehold = { ...mockChore, household: { ...mockHousehold, members: [mockUser] } }; // Ensure members list is explicit
      choreRepository.findOne!.mockResolvedValue(choreWithHousehold);

      await expect(service.toggleCompletion(mockChore.id, anotherUser))
        .rejects.toThrow(ForbiddenException);
    });
  });

}); 
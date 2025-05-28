import { Test, TestingModule } from '@nestjs/testing';
import { HouseholdsService } from './households.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Household } from './entities/household.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Repository } from 'typeorm';
import { CreateHouseholdDto } from './dto/create-household.dto';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

// Mock data
const mockCreatingUser: User = {
  id: 'user-creator-id',
  email: 'creator@example.com',
  name: 'Creator User',
  password: 'hashedpassword',
  role: UserRole.MEMBER, // Initial role before creating household
  householdId: null,
  household: null,
  assignedChores: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockExistingHousehold: Household = {
  id: 'existing-household-id',
  name: 'Old House',
  members: [],
  chores: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

type MockRepository<T extends object = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <T extends object = any>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let householdRepository: MockRepository<Household>;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    usersService = {
      // findOneById: jest.fn(), // Not directly used by HouseholdsService methods being tested yet
      save: jest.fn(), // Used in create household
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        {
          provide: getRepositoryToken(Household),
          useValue: createMockRepository<Household>(),
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    service = module.get<HouseholdsService>(HouseholdsService);
    householdRepository = module.get<MockRepository<Household>>(
      getRepositoryToken(Household),
    );
    // Reset mocks before each test to ensure test isolation
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createHouseholdDto: CreateHouseholdDto = {
      name: 'New Awesome Household',
    };

    it('should successfully create a household and assign user as owner', async () => {
      const userNotInHousehold = {
        ...mockCreatingUser,
        householdId: null,
        household: null,
      };
      const newHouseholdEntity = {
        id: 'new-household-id',
        ...createHouseholdDto,
        members: [],
        chores: [],
      };
      const populatedHousehold = {
        ...newHouseholdEntity,
        members: [
          {
            ...userNotInHousehold,
            role: UserRole.OWNER,
            householdId: newHouseholdEntity.id,
          },
        ],
      };

      householdRepository.create!.mockReturnValue(newHouseholdEntity as any);
      householdRepository.save!.mockResolvedValue(newHouseholdEntity as any);
      (usersService.save as jest.Mock).mockImplementation(async (user) => user); // mock user save
      householdRepository.findOne!.mockResolvedValue(populatedHousehold as any); // For the refetch

      const result = await service.create(
        createHouseholdDto,
        userNotInHousehold,
      );

      expect(householdRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(createHouseholdDto),
      );
      expect(householdRepository.save).toHaveBeenCalledWith(newHouseholdEntity);
      expect(usersService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: userNotInHousehold.id,
          householdId: newHouseholdEntity.id,
          household: newHouseholdEntity,
          role: UserRole.OWNER,
        }),
      );
      expect(householdRepository.findOne).toHaveBeenCalledWith({
        where: { id: newHouseholdEntity.id },
        relations: ['members'],
      });
      expect(result).toEqual(populatedHousehold);
      expect(result.members[0].role).toBe(UserRole.OWNER);
    });

    it('should throw ConflictException if user is already in a household', async () => {
      const userInHousehold = {
        ...mockCreatingUser,
        householdId: mockExistingHousehold.id,
        household: mockExistingHousehold,
      };
      householdRepository.findOne!.mockResolvedValue(mockExistingHousehold); // For the check if user is in household

      await expect(
        service.create(createHouseholdDto, userInHousehold),
      ).rejects.toThrow(ConflictException);
      expect(householdRepository.findOne).toHaveBeenCalledWith({
        where: { id: userInHousehold.householdId },
      });
    });

    it('should allow creating a household if user.householdId is set but household findOne returns null (data inconsistency)', async () => {
      const userWithOrphanedHouseholdId = {
        ...mockCreatingUser,
        householdId: 'orphan-id',
        household: null,
      };
      const newHouseholdEntity = {
        id: 'new-household-id-2',
        ...createHouseholdDto,
        members: [],
        chores: [],
      };
      const populatedHousehold = {
        ...newHouseholdEntity,
        members: [
          {
            ...userWithOrphanedHouseholdId,
            role: UserRole.OWNER,
            householdId: newHouseholdEntity.id,
          },
        ],
      };

      householdRepository.findOne!.mockResolvedValueOnce(null); // First findOne (for existing household check) returns null
      householdRepository.create!.mockReturnValue(newHouseholdEntity as any);
      householdRepository.save!.mockResolvedValue(newHouseholdEntity as any);
      (usersService.save as jest.Mock).mockImplementation(async (user) => user);
      householdRepository.findOne!.mockResolvedValueOnce(
        populatedHousehold as any,
      ); // Second findOne (for refetch)

      const result = await service.create(
        createHouseholdDto,
        userWithOrphanedHouseholdId,
      );
      expect(result).toEqual(populatedHousehold);
      expect(householdRepository.create).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if household fails to be retrieved after creation', async () => {
      const userNotInHousehold = {
        ...mockCreatingUser,
        householdId: null,
        household: null,
      };
      const newHouseholdEntity = {
        id: 'new-household-id-fail',
        ...createHouseholdDto,
        members: [],
        chores: [],
      };

      householdRepository.create!.mockReturnValue(newHouseholdEntity as any);
      householdRepository.save!.mockResolvedValue(newHouseholdEntity as any);
      (usersService.save as jest.Mock).mockImplementation(async (user) => user);
      householdRepository.findOne!.mockResolvedValue(null); // Simulate failure to refetch

      await expect(
        service.create(createHouseholdDto, userNotInHousehold),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOneByIdWithMembers', () => {
    it('should return a household with members if found', async () => {
      const householdWithMembers = {
        ...mockExistingHousehold,
        members: [mockCreatingUser],
      };
      householdRepository.findOne!.mockResolvedValue(householdWithMembers);

      const result = await service.findOneByIdWithMembers(
        mockExistingHousehold.id,
      );
      expect(householdRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockExistingHousehold.id },
        relations: ['members'],
      });
      expect(result).toEqual(householdWithMembers);
    });

    it('should return null if household not found', async () => {
      householdRepository.findOne!.mockResolvedValue(null);
      const result = await service.findOneByIdWithMembers('non-existent-id');
      expect(result).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ChoresController } from './chores.controller';
import { ChoresService } from './chores.service';
import { UsersService } from '../users/users.service';
import { CreateChoreDto } from './dto/create-chore.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Chore, ChoreRecurrence } from './entities/chore.entity';
import { AuthGuard } from '@nestjs/passport';
import {
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ArgumentMetadata,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Household } from '../households/entities/household.entity';

const mockUser: User = {
  id: 'user-id-123',
  email: 'test@user.com',
  name: 'Test User',
  password: 'hashedPassword',
  role: UserRole.MEMBER,
  householdId: 'household-id-abc',
  assignedChores: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockHousehold: Household = {
  id: 'household-id-abc',
  name: 'Test Household',
  members: [mockUser],
  chores: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockChore: Chore = {
  id: 'chore-id-xyz',
  title: 'Test Chore',
  householdId: 'household-id-abc',
  household: mockHousehold,
  isCompleted: false,
  recurrence: ChoreRecurrence.NONE,
  createdById: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ChoresController', () => {
  let controller: ChoresController;
  let choresService: ChoresService;
  let usersService: UsersService;

  const mockChoresService = {
    create: jest.fn(),
    findAllByHousehold: jest.fn(),
    toggleCompletion: jest.fn(),
  };

  const mockUsersService = {
    findOneById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChoresController],
      providers: [
        { provide: ChoresService, useValue: mockChoresService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(AuthGuard('jwt')) // Mock the guard
      .useValue({ canActivate: () => true }) // Allow all requests
      .compile();

    controller = module.get<ChoresController>(ChoresController);
    choresService = module.get<ChoresService>(ChoresService);
    usersService = module.get<UsersService>(UsersService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createChoreDto: CreateChoreDto = {
      title: 'New Chore from Controller',
      householdId: 'household-id-abc',
      description: 'A detailed description',
      dueDate: new Date().toISOString(),
      recurrence: ChoreRecurrence.DAILY,
    };
    const mockRequest = { user: { id: mockUser.id } };

    it('should create a chore successfully', async () => {
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      (mockChoresService.create as jest.Mock).mockResolvedValue(mockChore);

      const result = await controller.create(createChoreDto, mockRequest);

      expect(mockUsersService.findOneById).toHaveBeenCalledWith(mockUser.id);
      expect(mockChoresService.create).toHaveBeenCalledWith(
        createChoreDto,
        mockUser,
      );
      expect(result).toEqual(mockChore);
    });

    it('should throw ForbiddenException if user not found from token', async () => {
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.create(createChoreDto, mockRequest),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith(mockUser.id);
      expect(mockChoresService.create).not.toHaveBeenCalled();
    });

    // Test for ValidationPipe (basic check, NestJS handles detailed validation)
    // it('should use ValidationPipe for the body', async () => {
    //   const metadata: ArgumentMetadata = { type: 'body', metatype: CreateChoreDto, data: '' };
    //   const validationPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    //   const invalidDto = { ...createChoreDto, title: null }; // Invalid title

    //   try {
    //     await validationPipe.transform(invalidDto as any, metadata);
    //     throw new Error('Transform should have failed for invalid DTO');
    //   } catch (e: any) {
    //     expect(e).toBeInstanceOf(BadRequestException);
    //     expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    //   }

    //   const validTransformedDto = await validationPipe.transform(createChoreDto, metadata);
    //   expect(validTransformedDto).toEqual(expect.objectContaining(createChoreDto));
    // });
  });

  describe('findAllByHousehold', () => {
    const householdId = 'household-id-abc';
    const mockRequest = { user: { id: mockUser.id } };

    it('should return chores for a household', async () => {
      const choresList = [mockChore, { ...mockChore, id: 'chore-id-def' }];
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      (mockChoresService.findAllByHousehold as jest.Mock).mockResolvedValue(
        choresList,
      );

      const result = await controller.findAllByHousehold(
        householdId,
        mockRequest,
      );

      expect(mockUsersService.findOneById).toHaveBeenCalledWith(mockUser.id);
      expect(mockChoresService.findAllByHousehold).toHaveBeenCalledWith(
        householdId,
        mockUser,
      );
      expect(result).toEqual(choresList);
    });

    it('should throw ForbiddenException if user not found from token', async () => {
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.findAllByHousehold(householdId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findOneById).toHaveBeenCalledWith(mockUser.id);
      expect(mockChoresService.findAllByHousehold).not.toHaveBeenCalled();
    });

    // Test for ParseUUIDPipe (basic check)
    // it('should use ParseUUIDPipe for householdId query param', async () => {
    //   const metadata: ArgumentMetadata = { type: 'query', metatype: String, data: 'householdId' };
    //   const uuidPipe = new ParseUUIDPipe({ version: '4' });
    //   const validUUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
    //   const invalidUUID = 'not-a-uuid';

    //   try {
    //     await uuidPipe.transform(invalidUUID, metadata);
    //     throw new Error('Transform should have failed for invalid UUID');
    //   } catch (e: any) {
    //     expect(e).toBeInstanceOf(BadRequestException);
    //     expect(e.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    //     expect(e.getResponse().message).toContain('Validation failed (uuid v 4 is expected)');
    //   }

    //   const transformedValidUUID = await uuidPipe.transform(validUUID, metadata);
    //   expect(transformedValidUUID).toBe(validUUID);
    // });
  });

  describe('toggleChoreCompletion', () => {
    const choreId = mockChore.id;
    const mockRequest = { user: { id: mockUser.id } };

    it('should successfully toggle chore completion', async () => {
      const updatedChore = {
        ...mockChore,
        isCompleted: !mockChore.isCompleted,
      };
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      (mockChoresService.toggleCompletion as jest.Mock).mockResolvedValue(
        updatedChore,
      );

      const result = await controller.toggleChoreCompletion(
        choreId,
        mockRequest,
      );

      expect(mockUsersService.findOneById).toHaveBeenCalledWith(mockUser.id);
      expect(mockChoresService.toggleCompletion).toHaveBeenCalledWith(
        choreId,
        mockUser,
      );
      expect(result).toEqual(updatedChore);
    });

    it('should throw ForbiddenException if user not found from token', async () => {
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.toggleChoreCompletion(choreId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
      expect(mockChoresService.toggleCompletion).not.toHaveBeenCalled();
    });

    it('should propagate exceptions from ChoresService (e.g., NotFoundException)', async () => {
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      const errorMessage = `Chore with ID ${choreId} not found.`;
      (mockChoresService.toggleCompletion as jest.Mock).mockRejectedValue(
        new NotFoundException(errorMessage),
      );

      await expect(
        controller.toggleChoreCompletion(choreId, mockRequest),
      ).rejects.toThrow(NotFoundException);
      expect(mockChoresService.toggleCompletion).toHaveBeenCalledWith(
        choreId,
        mockUser,
      );
    });

    it('should propagate exceptions from ChoresService (e.g., ForbiddenException for authz)', async () => {
      (mockUsersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      const errorMessage = 'You are not authorized to modify this chore.';
      (mockChoresService.toggleCompletion as jest.Mock).mockRejectedValue(
        new ForbiddenException(errorMessage),
      );

      await expect(
        controller.toggleChoreCompletion(choreId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

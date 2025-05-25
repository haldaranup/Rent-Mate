import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus, ValidationPipe, UnauthorizedException, Delete, Param, Logger } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service'; // Import UsersService

@Controller('households')
@UseGuards(AuthGuard('jwt')) // Protect all routes in this controller
export class HouseholdsController {
  private readonly logger = new Logger(HouseholdsController.name);

  constructor(
    private readonly householdsService: HouseholdsService,
    private readonly usersService: UsersService, // Inject UsersService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) createHouseholdDto: CreateHouseholdDto,
    @Request() req: any, // Using any for now, ideally create a typed request object
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string }; // Ensure id is present
    
    // Fetch the full user entity to ensure we have a complete User instance for ORM operations
    const creatingUser = await this.usersService.findOneById(partialUser.id);

    if (!creatingUser) {
      // This should not happen if JWT is valid and user exists, but good for robustness
      throw new UnauthorizedException('User not found from token.');
    }
    
    return this.householdsService.create(createHouseholdDto, creatingUser);
  }

  @Delete('members/:memberUserId')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content is typical for successful DELETE
  async removeMember(
    @Param('memberUserId') memberUserIdToRemove: string,
    @Request() req: any,
  ) {
    const requestingUser = req.user as User; // User from JWT

    if (!requestingUser.householdId) {
      this.logger.warn(`User ${requestingUser.id} (not in a household) attempted to remove member ${memberUserIdToRemove}.`);
      throw new UnauthorizedException('You must be part of a household to manage its members.');
    }
    
    this.logger.log(`User ${requestingUser.id} (owner of household ${requestingUser.householdId}) attempting to remove member ${memberUserIdToRemove}.`);

    await this.householdsService.removeMemberFromHousehold(
      requestingUser.householdId, 
      memberUserIdToRemove, 
      requestingUser,
    );
    // No content to return on successful deletion
  }
} 
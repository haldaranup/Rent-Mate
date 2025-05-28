import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import {
  ExpensesService,
  UserBalance,
  SettleUpSuggestion,
} from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequestWithUser } from '../auth/interfaces/auth.interface';
import { UsersService } from '../users/users.service';
import {
  ApiOperation,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';

@Controller('expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    createExpenseDto: CreateExpenseDto,
    @Request() req: any,
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const creatingUser = await this.usersService.findOneById(partialUser.id);
    if (!creatingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    return this.expensesService.create(createExpenseDto, creatingUser);
  }

  @Get()
  async findAllForCurrentUserHousehold(@Request() req: any) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const requestingUser = await this.usersService.findOneById(partialUser.id);
    if (!requestingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    if (!requestingUser.householdId) {
      throw new ForbiddenException(
        'User does not belong to a household. Cannot fetch expenses.',
      );
    }
    return this.expensesService.findAllForUserHousehold(requestingUser);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) expenseId: string,
    @Request() req: any,
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const requestingUser = await this.usersService.findOneById(partialUser.id);
    if (!requestingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    return this.expensesService.findOne(expenseId, requestingUser);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) expenseId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    updateExpenseDto: UpdateExpenseDto,
    @Request() req: any,
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const requestingUser = await this.usersService.findOneById(partialUser.id);
    if (!requestingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    return this.expensesService.update(
      expenseId,
      updateExpenseDto,
      requestingUser,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) expenseId: string,
    @Request() req: any,
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const requestingUser = await this.usersService.findOneById(partialUser.id);
    if (!requestingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    return this.expensesService.remove(expenseId, requestingUser);
  }

  @Patch('/shares/:shareId/settle')
  @HttpCode(HttpStatus.OK)
  async settleExpenseShare(
    @Param('shareId', new ParseUUIDPipe({ version: '4' })) shareId: string,
    @Request() req: any,
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const requestingUser = await this.usersService.findOneById(partialUser.id);
    if (!requestingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    return this.expensesService.toggleExpenseShareSettlement(
      shareId,
      true,
      requestingUser,
    );
  }

  @Patch('/shares/:shareId/unsettle')
  @HttpCode(HttpStatus.OK)
  async unsettleExpenseShare(
    @Param('shareId', new ParseUUIDPipe({ version: '4' })) shareId: string,
    @Request() req: any,
  ) {
    const partialUser = req.user as Omit<User, 'password'> & { id: string };
    const requestingUser = await this.usersService.findOneById(partialUser.id);
    if (!requestingUser) {
      throw new ForbiddenException('User not found based on token.');
    }
    return this.expensesService.toggleExpenseShareSettlement(
      shareId,
      false,
      requestingUser,
    );
  }

  @Get('/household/balances')
  @ApiOperation({
    summary: "Get expense balances for the current user's household",
  })
  @ApiOkResponse({
    description: 'Successfully retrieved household balances.',
    isArray: true,
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/UserBalance' },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden. User not in a household or trying to access unauthorized data.',
  })
  @ApiNotFoundResponse({ description: 'Household not found.' })
  async getHouseholdBalances(
    @Req() req: AuthenticatedRequestWithUser,
  ): Promise<UserBalance[]> {
    if (!req.user.householdId) {
      throw new ForbiddenException(
        'User must belong to a household to view balances.',
      );
    }
    return this.expensesService.getHouseholdBalances(
      req.user.householdId,
      req.user,
    );
  }

  @Get('/household/settle-up')
  @ApiOperation({
    summary: "Get settle-up suggestions for the current user's household",
  })
  @ApiOkResponse({
    description: 'Successfully retrieved settle-up suggestions.',
    isArray: true,
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/SettleUpSuggestion' },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden. User not in a household or trying to access unauthorized data.',
  })
  @ApiNotFoundResponse({ description: 'Household not found.' })
  async getSettleUpSuggestions(
    @Req() req: AuthenticatedRequestWithUser,
  ): Promise<SettleUpSuggestion[]> {
    if (!req.user.householdId) {
      throw new ForbiddenException(
        'User must belong to a household to get settle-up suggestions.',
      );
    }
    return this.expensesService.getSettleUpSuggestions(
      req.user.householdId,
      req.user,
    );
  }
}

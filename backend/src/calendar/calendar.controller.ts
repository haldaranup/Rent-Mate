import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequestWithUser } from '../auth/interfaces/auth.interface';
import { CalendarEventDto } from './dto';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth, ApiQuery, ApiForbiddenResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  @ApiOperation({
    summary: 'Get calendar events for the current user\'s household',
    description: 'Retrieves chores and expenses formatted as calendar events for a given date range.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date of the range (ISO 8601 format, e.g., 2024-07-01T00:00:00.000Z)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date of the range (ISO 8601 format, e.g., 2024-07-31T23:59:59.999Z)',
    type: String,
  })
  @ApiOkResponse({
    description: 'Successfully retrieved calendar events.',
    type: [CalendarEventDto],
  })
  @ApiForbiddenResponse({ description: 'User not part of a household or trying to access another household\'s data.' })
  @ApiBadRequestResponse({ description: 'Invalid date format for startDate or endDate.' })
  async getHouseholdCalendarEvents(
    @Req() req: AuthenticatedRequestWithUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<CalendarEventDto[]> {
    const user = req.user as User;
    if (!user.householdId) {
      throw new ForbiddenException('User is not associated with a household.');
    }
    // The service will also validate if user.householdId matches the one being queried (if we pass it explicitly, but here it's implicit)
    return this.calendarService.getCalendarEvents(
      user.householdId,
      startDate,
      endDate,
      user,
    );
  }
} 
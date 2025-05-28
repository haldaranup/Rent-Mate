import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequestWithUser } from '../auth/interfaces/auth.interface';
import { ActivityLogDto, PaginatedActivityLogResponseDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { User } from '../users/entities/user.entity';

@ApiTags('Activity Log')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({
    summary: "Get activity logs for the current user's household",
    description:
      'Retrieves a paginated list of activity logs for the household the authenticated user belongs to.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination.',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page.',
    type: Number,
    example: 20,
  })
  @ApiOkResponse({
    description: 'Successfully retrieved activity logs.',
    type: PaginatedActivityLogResponseDto,
  })
  @ApiForbiddenResponse({ description: 'User not part of a household.' })
  async getHouseholdActivityLogs(
    @Req() req: AuthenticatedRequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedActivityLogResponseDto> {
    const user = req.user as User;
    if (!user.householdId) {
      throw new ForbiddenException('User is not associated with a household.');
    }
    return this.activityLogService.getActivityLogsForHousehold(
      user.householdId,
      page,
      limit,
    );
  }
}

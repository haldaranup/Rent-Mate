import { ApiProperty } from '@nestjs/swagger';
import { ActivityLogDto } from './activity-log.dto';

export class PaginatedActivityLogResponseDto {
  @ApiProperty({
    type: [ActivityLogDto],
    description: 'List of activity logs for the current page.',
  })
  logs: ActivityLogDto[];

  @ApiProperty({
    example: 100,
    description: 'Total number of activity logs available.',
  })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number.' })
  page: number;

  @ApiProperty({ example: 20, description: 'Number of items per page.' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages.' })
  totalPages: number;
} 
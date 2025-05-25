import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityType } from './entities/activity-log.entity';
import { CreateActivityLogDto, ActivityLogDto, ActorDto, PaginatedActivityLogResponseDto } from './dto';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async createLogEntry(
    data: CreateActivityLogDto,
  ): Promise<ActivityLog> {
    try {
      const newLog = this.activityLogRepository.create({
        householdId: data.householdId,
        actorId: data.actorId,
        entityId: data.entityId,
        entityType: data.entityType,
        activityType: data.activityType,
        details: data.details,
      });
      const savedLog = await this.activityLogRepository.save(newLog);
      return savedLog;
    } catch (error) {
      this.logger.error(
        `Failed to create activity log: ${error.message}`,
        error.stack,
        data,
      );
      throw error;
    }
  }

  async getActivityLogsForHousehold(
    householdId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedActivityLogResponseDto> {
    const skip = (page - 1) * limit;
    const [logs, total] = await this.activityLogRepository.findAndCount({
      where: { householdId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: skip,
      take: limit,
    });

    return {
      logs: logs.map(log => this.mapToDto(log)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapToDto(log: ActivityLog): ActivityLogDto {
    let actorDto: ActorDto | null = null;
    if (log.actor) {
        actorDto = {
            id: log.actor.id,
            name: log.actor.name || log.actor.email,
        };
    }

    return {
        id: log.id,
        householdId: log.householdId,
        actor: actorDto,
        entityId: log.entityId,
        entityType: log.entityType,
        activityType: log.activityType,
        details: log.details,
        createdAt: log.createdAt,
    };
  }
} 
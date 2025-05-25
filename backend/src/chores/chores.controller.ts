import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, 
  ParseUUIDPipe, Query, HttpCode, HttpStatus 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Standard NestJS JWT Guard
import { ChoresService } from './chores.service';
import { CreateChoreDto } from './dto/create-chore.dto';
import { UpdateChoreDto } from './dto/update-chore.dto';
import { AuthenticatedRequestWithUser } from '../auth/interfaces/auth.interface'; // Updated import

@UseGuards(AuthGuard('jwt'))
@Controller('chores')
export class ChoresController {
  constructor(private readonly choresService: ChoresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createChoreDto: CreateChoreDto, @Req() req: AuthenticatedRequestWithUser) {
    // req.user should be the full User object from JwtStrategy
    return this.choresService.create(createChoreDto, req.user);
  }

  @Get()
  findAllForMyHousehold(@Req() req: AuthenticatedRequestWithUser) {
    if (!req.user.householdId) {
        // If user must be in a household to see chores, service should handle or throw.
        // For controller, returning empty array or specific response.
        return []; 
    }
    return this.choresService.findAllForHousehold(req.user.householdId, req.user);
  }

  @Get('assigned')
  findAssignedChores(
    @Req() req: AuthenticatedRequestWithUser,
    @Query('userId') userId?: string, // Optional: if querying for another user (admin/owner might do this)
  ) {
    const targetUserId = userId || req.user.id; // Default to current user
    return this.choresService.getAssignedChoresForUser(targetUserId, req.user);
  }

  @Get('unassigned')
  findUnassignedChores(@Req() req: AuthenticatedRequestWithUser) {
    if (!req.user.householdId) {
        return [];
    }
    return this.choresService.getUnassignedChores(req.user.householdId, req.user);
  }

  @Get('stats')
  getChoreStats(@Req() req: AuthenticatedRequestWithUser) {
    if (!req.user.householdId) {
        return { total: 0, completed: 0, pending: 0 }; 
    }
    return this.choresService.getChoreCounts(req.user.householdId, req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequestWithUser) {
    return this.choresService.findOne(id, req.user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChoreDto: UpdateChoreDto,
    @Req() req: AuthenticatedRequestWithUser,
  ) {
    return this.choresService.update(id, updateChoreDto, req.user);
  }

  @Patch(':id/toggle-complete')
  @HttpCode(HttpStatus.OK)
  toggleComplete(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequestWithUser) {
    return this.choresService.toggleComplete(id, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequestWithUser) {
    await this.choresService.remove(id, req.user);
    // No explicit return needed for 204 No Content with async void service method
  }
} 
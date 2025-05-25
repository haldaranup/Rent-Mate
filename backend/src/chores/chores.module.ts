import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chore } from './entities/chore.entity';
import { ChoresService } from './chores.service';
import { ChoresController } from './chores.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chore]),
    AuthModule, // For JWT protection and getting current user
    forwardRef(() => UsersModule), // For validating assignedToId and fetching user details
    forwardRef(() => HouseholdsModule), // For ensuring user belongs to a household and chore is linked to it
  ],
  controllers: [ChoresController],
  providers: [ChoresService],
  exports: [ChoresService, TypeOrmModule] // Export service if other modules need to inject it directly
})
export class ChoresModule {}

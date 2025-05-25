import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { Invitation } from './entities/invitation.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { HouseholdsModule } from '../households/households.module'; // For household context
import { InvitationsController } from './invitations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    AuthModule, // For user context, if needed directly here or in controller
    UsersModule, // To interact with User entity
    MailModule, // To send invitation emails
    forwardRef(() => HouseholdsModule), // To avoid circular dependency with HouseholdsModule if it imports InvitationsModule
  ],
  providers: [InvitationsService],
  exports: [InvitationsService],
  controllers: [InvitationsController], // Export service if other modules need to use it directly
})
export class InvitationsModule {}

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Logger,
  HttpException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { GenerateShortCodeInvitationDto } from './dto/generate-short-code-invitation.dto';
import { JoinByShortCodeDto } from './dto/join-by-short-code.dto';
import { User } from '../users/entities/user.entity'; // For type hinting req.user

@Controller('invitations')
export class InvitationsController {
  private readonly logger = new Logger(InvitationsController.name);
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('send-email')
  @HttpCode(HttpStatus.CREATED)
  async sendEmailInvitation(
    @Body() createEmailDto: CreateInvitationDto,
    @Req() req: any,
  ) {
    const invitingUser = req.user as User;
    this.logger.log(
      `User ${invitingUser.id} attempting to send EMAIL invitation to ${createEmailDto.email} for household ${createEmailDto.householdId}`,
    );
    return this.invitationsService.createEmailInvitation(
      createEmailDto.householdId,
      createEmailDto.email,
      invitingUser,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate-code')
  @HttpCode(HttpStatus.CREATED)
  async generateShortCodeInvitation(
    @Body() generateDto: GenerateShortCodeInvitationDto,
    @Req() req: any,
  ) {
    const invitingUser = req.user as User;
    this.logger.log(
      `User ${invitingUser.id} attempting to generate SHORT CODE for household ${generateDto.householdId}`,
    );
    const invitation =
      await this.invitationsService.createHouseholdShortCodeInvitation(
        generateDto.householdId,
        invitingUser,
      );
    return {
      shortCode: invitation.shortCode,
      expiresAt: invitation.expiresAt,
      householdId: invitation.householdId,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('accept-by-token')
  @HttpCode(HttpStatus.OK)
  async acceptInvitationByToken(
    @Body() acceptTokenDto: AcceptInvitationDto,
    @Req() req: any,
  ) {
    const acceptingUser = req.user as User;
    this.logger.log(
      `User ${acceptingUser.id} attempting to accept invitation by TOKEN ${acceptTokenDto.token}`,
    );
    return this.invitationsService.acceptInvitationByToken(
      acceptTokenDto.token,
      acceptingUser,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join-by-code')
  @HttpCode(HttpStatus.OK)
  async joinByShortCode(
    @Body() joinByCodeDto: JoinByShortCodeDto,
    @Req() req: any,
  ) {
    const acceptingUser = req.user as User;
    this.logger.log(
      `User ${acceptingUser.id} attempting to join household using SHORT CODE ${joinByCodeDto.shortCode}`,
    );
    return this.invitationsService.acceptInvitationByShortCode(
      joinByCodeDto.shortCode,
      acceptingUser,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('decline-by-token')
  @HttpCode(HttpStatus.OK)
  async declineInvitationByToken(
    @Body() acceptTokenDto: AcceptInvitationDto,
    @Req() req: any,
  ) {
    const decliningUser = req.user as User;
    this.logger.log(
      `User ${decliningUser.id} attempting to DECLINE invitation by TOKEN ${acceptTokenDto.token}`,
    );
    await this.invitationsService.declineInvitationByToken(
      acceptTokenDto.token,
      decliningUser,
    );
    return { message: 'Invitation successfully declined.' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':invitationId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSentInvitation(
    @Param('invitationId') invitationId: string,
    @Req() req: any,
  ) {
    const cancellingUser = req.user as User;
    this.logger.log(
      `User ${cancellingUser.id} attempting to CANCEL invitation ${invitationId}`,
    );
    const updatedInvitation =
      await this.invitationsService.cancelSentInvitation(
        invitationId,
        cancellingUser,
      );
    return updatedInvitation; // Or a simpler success message
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('pending') // Infers householdId from authenticated user
  @HttpCode(HttpStatus.OK)
  async getPendingInvitationsForMyHousehold(@Req() req: any) {
    const requestingUser = req.user as User;
    if (!requestingUser.householdId) {
      this.logger.warn(
        `User ${requestingUser.id} attempting to fetch pending invites without being in a household.`,
      );
      throw new HttpException(
        'You must be part of a household to view its pending invitations',
        HttpStatus.BAD_REQUEST,
      );
    }
    this.logger.log(
      `User ${requestingUser.id} fetching PENDING invitations for their household ${requestingUser.householdId}`,
    );
    return this.invitationsService.getPendingInvitationsForHousehold(
      requestingUser.householdId,
      requestingUser,
    );
  }

  @Get('details-by-token/:token')
  @HttpCode(HttpStatus.OK)
  async getInvitationDetailsByToken(@Param('token') token: string) {
    this.logger.log(`Fetching details for invitation token: ${token}`);
    const invitation = await this.invitationsService.findByToken(token);
    if (!invitation || !invitation.email) {
      throw new HttpException(
        'Email-based invitation not found or token is invalid for this type of lookup',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      email: invitation.email,
      householdId: invitation.householdId,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    };
  }

  @Get('details-by-code/:shortCode')
  @HttpCode(HttpStatus.OK)
  async getInvitationDetailsByShortCode(@Param('shortCode') shortCode: string) {
    this.logger.log(`Fetching details for short code ${shortCode}`);
    const invitationDetails =
      await this.invitationsService.getInvitationDetailsByShortCode(shortCode);
    return invitationDetails;
  }
}

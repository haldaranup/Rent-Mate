import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsUUID()
  @IsNotEmpty()
  readonly householdId: string;
} 
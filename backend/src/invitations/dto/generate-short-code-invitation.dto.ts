import { IsNotEmpty, IsUUID } from 'class-validator';

export class GenerateShortCodeInvitationDto {
  @IsUUID()
  @IsNotEmpty()
  readonly householdId: string;
}

import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class JoinByShortCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6) // Assuming SHORT_CODE_LENGTH is 6
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Invitation code must be uppercase alphanumeric.',
  })
  readonly shortCode: string;
}

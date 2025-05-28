import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateHouseholdDto {
  @IsString()
  @MinLength(2, {
    message: 'Household name must be at least 2 characters long.',
  })
  @MaxLength(100, {
    message: 'Household name cannot be longer than 100 characters.',
  })
  name: string;
}

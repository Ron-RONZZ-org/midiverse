import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message:
      'profileBackgroundColor must be a valid hex color code (e.g., #FF5733)',
  })
  profileBackgroundColor?: string;
}

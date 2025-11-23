import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsBoolean()
  darkTheme?: boolean;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  profilePageVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  profilePictureVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVisible?: boolean;
}

import { IsOptional, IsBoolean, IsString, IsInt } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  emailComplaintsNotifications?: boolean;

  @IsOptional()
  @IsString()
  defaultEditorLanguage?: string;

  @IsOptional()
  @IsInt()
  defaultEditorMaxWidth?: number;

  @IsOptional()
  @IsInt()
  defaultEditorColorFreezeLevel?: number;

  @IsOptional()
  @IsInt()
  defaultEditorInitialExpandLevel?: number;
}

import { IsOptional, IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class UpdateEmailPreferencesDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsBoolean()
  emailComplaintsNotifications?: boolean;
}

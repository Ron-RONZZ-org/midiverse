import { IsOptional, IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class EmailPreferencesTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class UpdateEmailPreferencesDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsBoolean()
  emailComplaintsNotifications?: boolean;
}

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiKeyPermission } from '@prisma/client';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ApiKeyPermission)
  permission: ApiKeyPermission;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

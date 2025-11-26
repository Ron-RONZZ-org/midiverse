import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';

export enum UserRole {
  USER = 'user',
  CONTENT_MANAGER = 'content_manager',
  ADMINISTRATOR = 'administrator',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class SuspendUserDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  years?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  months?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hours?: number;
}

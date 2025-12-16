import { SetMetadata } from '@nestjs/common';
import { ApiKeyPermission } from '@prisma/client';

export const REQUIRE_API_PERMISSION_KEY = 'requireApiPermission';
export const RequireApiPermission = (permission: ApiKeyPermission) =>
  SetMetadata(REQUIRE_API_PERMISSION_KEY, permission);

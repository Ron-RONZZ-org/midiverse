import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_API_PERMISSION_KEY } from '../decorators/require-api-permission.decorator';
import { ApiKeyPermission } from '@prisma/client';

interface RequestWithUser {
  user?: {
    apiKeyPermission?: ApiKeyPermission;
  };
}

@Injectable()
export class ApiPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission =
      this.reflector.getAllAndOverride<ApiKeyPermission>(
        REQUIRE_API_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermission) {
      // If no permission requirement, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // If using JWT auth (no apiKeyPermission), allow access
    if (!user || !user.apiKeyPermission) {
      return true;
    }

    // Check if API key has required permission
    if (requiredPermission === ApiKeyPermission.full_access) {
      if (user.apiKeyPermission !== ApiKeyPermission.full_access) {
        throw new ForbiddenException(
          'This operation requires an API key with full_access permission',
        );
      }
    }

    return true;
  }
}

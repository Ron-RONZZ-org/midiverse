import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/roles.guard';

export type UserRole = 'user' | 'content_manager' | 'administrator';

/**
 * Decorator to specify which roles are allowed to access a route.
 * Use with RolesGuard.
 *
 * @example
 * @Roles('administrator')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async adminOnlyRoute() { ... }
 *
 * @example
 * @Roles('content_manager', 'administrator')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async contentManagerOrAdminRoute() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

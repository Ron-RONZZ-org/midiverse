import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserFromToken } from '../interfaces/auth.interface';

/**
 * Guard that prevents suspended users from performing write operations.
 * Should be used in combination with JwtAuthGuard.
 */
@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: UserFromToken }>();

    if (!user) {
      return true; // Let JwtAuthGuard handle authentication
    }

    if (user.status === 'suspended') {
      const suspendedMsg = user.suspendedUntil
        ? ` until ${new Date(user.suspendedUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        : '';
      throw new ForbiddenException(
        `Your account is suspended${suspendedMsg}. You cannot publish or edit content.`,
      );
    }

    return true;
  }
}

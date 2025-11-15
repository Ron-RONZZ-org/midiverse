import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to allow requests without authentication
  handleRequest(err: any, user: any) {
    // If there's an error or no user, just return null (don't throw)
    return user || null;
  }

  // Override canActivate to always return true
  canActivate(context: ExecutionContext) {
    // Try to authenticate, but don't fail if it doesn't work
    return super.canActivate(context) as Promise<boolean> | boolean;
  }
}

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override canActivate to not throw on authentication failure
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Authentication failed, but we allow the request anyway
    }
    return true;
  }

  // Override handleRequest to return null instead of throwing
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // Return user if available, otherwise return null (but cast to avoid type error)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user || (null as any);
  }
}

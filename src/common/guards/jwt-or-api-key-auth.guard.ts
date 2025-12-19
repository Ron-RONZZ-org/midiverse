import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOrApiKeyAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any) {
    if (err || !user) {
      // If both strategies fail, throw error
      throw err || new UnauthorizedException();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}

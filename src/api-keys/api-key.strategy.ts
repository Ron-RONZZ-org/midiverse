import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private apiKeysService: ApiKeysService) {
    super();
  }

  async validate(token: string) {
    try {
      const result = await this.apiKeysService.validateApiKey(token);
      // Return user with permission info
      return {
        ...result.user,
        apiKeyPermission: result.permission,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}

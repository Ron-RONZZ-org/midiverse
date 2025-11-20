import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get('TURNSTILE_SECRET_KEY');
  }

  async verifyToken(token: string): Promise<boolean> {
    if (!this.secretKey) {
      this.logger.warn('Turnstile secret key not configured, skipping verification');
      return true; // Skip verification in development if not configured
    }

    try {
      const response = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          secret: this.secretKey,
          response: token,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.data.success) {
        this.logger.warn('Turnstile verification failed', response.data);
        throw new UnauthorizedException('Bot verification failed');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Turnstile verification error', error);
      throw new UnauthorizedException('Bot verification failed');
    }
  }
}

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyStrategy } from './api-key.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyStrategy],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}

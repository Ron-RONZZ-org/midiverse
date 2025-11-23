import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MarkmapsService } from './markmaps.service';
import { MarkmapsController } from './markmaps.controller';
import { KeynodesModule } from '../keynodes/keynodes.module';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    KeynodesModule,
  ],
  controllers: [MarkmapsController],
  providers: [MarkmapsService],
})
export class MarkmapsModule {}

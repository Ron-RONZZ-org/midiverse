import { Module } from '@nestjs/common';
import { MarkmapsService } from './markmaps.service';
import { MarkmapsController } from './markmaps.controller';

@Module({
  controllers: [MarkmapsController],
  providers: [MarkmapsService],
})
export class MarkmapsModule {}

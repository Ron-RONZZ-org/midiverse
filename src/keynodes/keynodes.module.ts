import { Module } from '@nestjs/common';
import { KeynodesService } from './keynodes.service';
import { KeynodesController } from './keynodes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KeynodesController],
  providers: [KeynodesService],
  exports: [KeynodesService],
})
export class KeynodesModule {}

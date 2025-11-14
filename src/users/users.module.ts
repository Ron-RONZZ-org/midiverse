import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MarkmapsModule } from '../markmaps/markmaps.module';
import { MarkmapsService } from '../markmaps/markmaps.service';

@Module({
  imports: [MarkmapsModule],
  controllers: [UsersController],
  providers: [UsersService, MarkmapsService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MarkmapsModule } from '../markmaps/markmaps.module';

@Module({
  imports: [MarkmapsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

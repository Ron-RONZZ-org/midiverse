import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MarkmapsModule } from '../markmaps/markmaps.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [MarkmapsModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

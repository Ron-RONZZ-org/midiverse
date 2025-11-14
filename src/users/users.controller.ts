import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserFromToken } from '../common/interfaces/auth.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: UserFromToken) {
    return this.usersService.getProfile(user.id);
  }

  @Get('markmaps')
  getUserMarkmaps(@CurrentUser() user: UserFromToken) {
    return this.usersService.getUserMarkmaps(user.id);
  }

  @Get('history')
  getUserHistory(@CurrentUser() user: UserFromToken) {
    return this.usersService.getUserHistory(user.id);
  }
}

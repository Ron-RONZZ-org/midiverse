import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Get('markmaps')
  getUserMarkmaps(@CurrentUser() user: any) {
    return this.usersService.getUserMarkmaps(user.id);
  }

  @Get('history')
  getUserHistory(@CurrentUser() user: any) {
    return this.usersService.getUserHistory(user.id);
  }
}

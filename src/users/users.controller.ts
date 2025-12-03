import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { UserFromToken } from '../common/interfaces/auth.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserFromToken) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: UserFromToken,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.id, updateUserDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: UserFromToken,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Post('verify-email-change')
  verifyEmailChange(@Body('token') token: string) {
    return this.usersService.verifyEmailChange(token);
  }

  @Post('cancel-pending-email')
  @UseGuards(JwtAuthGuard)
  cancelPendingEmailChange(@CurrentUser() user: UserFromToken) {
    return this.usersService.cancelPendingEmailChange(user.id);
  }

  @Get('profile/:username')
  @UseGuards(OptionalJwtAuthGuard)
  getProfileByUsername(
    @Param('username') username: string,
    @CurrentUser() user?: UserFromToken,
  ) {
    return this.usersService.getProfileByUsername(username, user?.id);
  }

  @Get('markmaps')
  @UseGuards(JwtAuthGuard)
  getUserMarkmaps(@CurrentUser() user: UserFromToken) {
    return this.usersService.getUserMarkmaps(user.id);
  }

  @Get('deleted-markmaps')
  @UseGuards(JwtAuthGuard)
  getDeletedMarkmaps(@CurrentUser() user: UserFromToken) {
    return this.usersService.getDeletedMarkmaps(user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getUserHistory(@CurrentUser() user: UserFromToken) {
    return this.usersService.getUserHistory(user.id);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  getUserPreferences(@CurrentUser() user: UserFromToken) {
    return this.usersService.getUserPreferences(user.id);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  updateUserPreferences(
    @CurrentUser() user: UserFromToken,
    @Body(ValidationPipe) updatePreferencesDto: UpdateUserPreferencesDto,
  ) {
    return this.usersService.updateUserPreferences(
      user.id,
      updatePreferencesDto,
    );
  }
}

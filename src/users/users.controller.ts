import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';
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
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.id, updateUserDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: UserFromToken,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Post('verify-email-change')
  verifyEmailChange(@Body() verifyEmailChangeDto: VerifyEmailChangeDto) {
    return this.usersService.verifyEmailChange(verifyEmailChangeDto.token);
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
    @Body() updatePreferencesDto: UpdateUserPreferencesDto,
  ) {
    console.log(
      '[DEBUG] Received preferences update:',
      JSON.stringify(updatePreferencesDto, null, 2),
    );
    return this.usersService.updateUserPreferences(
      user.id,
      updatePreferencesDto,
    );
  }

  /**
   * Get email preferences using a token (for unsubscribe/manage preferences links in emails)
   * No authentication required - token-based access
   */
  @Get('email-preferences')
  getEmailPreferences(@Query('token') token: string) {
    return this.usersService.getEmailPreferencesByToken(token);
  }

  /**
   * Update email preferences using a token (for unsubscribe/manage preferences links in emails)
   * No authentication required - token-based access
   */
  @Patch('email-preferences')
  updateEmailPreferences(
    @Body() updateEmailPreferencesDto: UpdateEmailPreferencesDto,
  ) {
    return this.usersService.updateEmailPreferencesByToken(
      updateEmailPreferencesDto.token,
      {
        emailComplaintsNotifications:
          updateEmailPreferencesDto.emailComplaintsNotifications,
      },
    );
  }
}

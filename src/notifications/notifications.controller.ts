import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserFromToken } from '../common/interfaces/auth.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get all notifications for the current user
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: UserFromToken) {
    return this.notificationsService.findAllForUser(user.id);
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser() user: UserFromToken) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@CurrentUser() user: UserFromToken) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.notificationsService.delete(id, user.id);
  }

  /**
   * Clear all notifications
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  clearAll(@CurrentUser() user: UserFromToken) {
    return this.notificationsService.clearAll(user.id);
  }
}

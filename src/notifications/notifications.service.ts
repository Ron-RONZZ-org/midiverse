import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a notification for a user
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      markmapId?: string;
      complaintId?: string;
      keynodeId?: string;
    },
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        markmapId: options?.markmapId,
        complaintId: options?.complaintId,
        keynodeId: options?.keynodeId,
      },
    });
  }

  /**
   * Get all notifications for a user
   */
  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Clear all notifications for a user
   */
  async clearAll(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }
}

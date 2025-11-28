import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  UpdateUserRoleDto,
  SuspendUserDto,
  UserRole,
} from './dto/user-management.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * List all users (for admin panel)
   */
  async listUsers(
    page = 1,
    perPage = 20,
    search?: string,
    roleFilter?: string,
    statusFilter?: string,
  ) {
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleFilter) {
      where.role = roleFilter;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: perPage,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          status: true,
          suspendedUntil: true,
          createdAt: true,
          _count: {
            select: { markmaps: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  /**
   * Get a single user's details
   */
  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        description: true,
        role: true,
        status: true,
        suspendedUntil: true,
        createdAt: true,
        _count: {
          select: {
            markmaps: true,
            series: true,
            viewHistory: true,
            interactions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a user's role
   */
  async updateUserRole(userId: string, updateRoleDto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: updateRoleDto.role },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
      },
    });

    // Notify user of role change
    try {
      const roleLabels: Record<UserRole, string> = {
        [UserRole.USER]: 'User',
        [UserRole.CONTENT_MANAGER]: 'Content Manager',
        [UserRole.ADMINISTRATOR]: 'Administrator',
      };
      await this.emailService.sendEmail(
        user.email,
        'Your account role has been updated',
        `Your account role has been updated to: ${roleLabels[updateRoleDto.role]}.`,
      );
    } catch (error) {
      console.error('Failed to send role change notification:', error);
    }

    return updatedUser;
  }

  /**
   * Suspend a user for a specified duration
   */
  async suspendUser(userId: string, suspendDto: SuspendUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate suspension end date
    let suspendedUntil: Date | null = null;

    const { years = 0, months = 0, days = 0, hours = 0 } = suspendDto;
    const hasDuration = years > 0 || months > 0 || days > 0 || hours > 0;

    if (hasDuration) {
      suspendedUntil = new Date();
      suspendedUntil.setFullYear(suspendedUntil.getFullYear() + years);
      suspendedUntil.setMonth(suspendedUntil.getMonth() + months);
      suspendedUntil.setDate(suspendedUntil.getDate() + days);
      suspendedUntil.setHours(suspendedUntil.getHours() + hours);
    }
    // If no duration specified, suspendedUntil remains null (permanent suspension)

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'suspended',
        suspendedUntil,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        suspendedUntil: true,
      },
    });

    // Notify user of suspension
    try {
      const durationMsg = suspendedUntil
        ? `Your suspension will end on ${suspendedUntil.toISOString()}.`
        : 'This suspension is permanent.';
      await this.emailService.sendEmail(
        user.email,
        'Your account has been suspended',
        `Your account has been suspended. ${durationMsg}\n\nDuring this time, you cannot publish or edit content.`,
      );
    } catch (error) {
      console.error('Failed to send suspension notification:', error);
    }

    return updatedUser;
  }

  /**
   * Reinstate a suspended user
   */
  async reinstateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'suspended') {
      throw new BadRequestException('User is not suspended');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'active',
        suspendedUntil: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
      },
    });

    // Notify user of reinstatement
    try {
      await this.emailService.sendEmail(
        user.email,
        'Your account has been reinstated',
        'Your account suspension has been lifted. You can now publish and edit content again.',
      );
    } catch (error) {
      console.error('Failed to send reinstatement notification:', error);
    }

    return updatedUser;
  }
}

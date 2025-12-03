import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkmapsService } from '../markmaps/markmaps.service';
import { EmailService } from '../email/email.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private markmapsService: MarkmapsService,
    private emailService: EmailService,
  ) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        description: true,
        profilePictureUrl: true,
        profileBackgroundColor: true,
        role: true,
        status: true,
        createdAt: true,
        lastEmailChange: true,
        lastUsernameChange: true,
        pendingEmail: true,
        _count: {
          select: {
            markmaps: true,
            viewHistory: true,
            interactions: true,
          },
        },
      },
    });
  }

  async getProfileByUsername(username: string, requestingUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        description: true,
        profilePictureUrl: true,
        profileBackgroundColor: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            markmaps: true,
            viewHistory: true,
            interactions: true,
          },
        },
        preferences: {
          select: {
            profilePageVisible: true,
            profilePictureVisible: true,
            emailVisible: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If the requesting user is viewing their own profile, include private info
    const isOwnProfile = requestingUserId === user.id;
    if (isOwnProfile) {
      const fullProfile = await this.prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          description: true,
          profilePictureUrl: true,
          profileBackgroundColor: true,
          role: true,
          status: true,
          createdAt: true,
          lastEmailChange: true,
          lastUsernameChange: true,
          pendingEmail: true,
          _count: {
            select: {
              markmaps: true,
              viewHistory: true,
              interactions: true,
            },
          },
        },
      });
      return { ...fullProfile, isOwnProfile };
    }

    // Apply privacy settings for other users
    const preferences = user.preferences || {
      profilePageVisible: true,
      profilePictureVisible: true,
      emailVisible: true,
    };

    // If profile page is not visible, return 404
    if (!preferences.profilePageVisible) {
      throw new NotFoundException('User not found');
    }

    // Build response based on privacy settings
    const publicProfile: {
      id: string;
      username: string;
      displayName: string | null;
      description: string | null;
      role: string;
      createdAt: Date;
      _count: { markmaps: number; viewHistory: number; interactions: number };
      isOwnProfile: boolean;
      profilePictureUrl?: string | null;
      profileBackgroundColor?: string | null;
      email?: string;
    } = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      description: user.description,
      role: user.role,
      createdAt: user.createdAt,
      _count: user._count,
      isOwnProfile,
    };

    // Only include profile picture if visible
    if (preferences.profilePictureVisible) {
      publicProfile.profilePictureUrl = user.profilePictureUrl;
      publicProfile.profileBackgroundColor = user.profileBackgroundColor;
    }

    // Only include email if visible
    if (preferences.emailVisible) {
      publicProfile.email = user.email;
    }

    return publicProfile;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        lastEmailChange: true,
        lastUsernameChange: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Check if email can be changed
    if (
      updateUserDto.email &&
      updateUserDto.email !== user.email &&
      user.lastEmailChange &&
      user.lastEmailChange > fifteenDaysAgo
    ) {
      const daysLeft = Math.ceil(
        (user.lastEmailChange.getTime() - fifteenDaysAgo.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      throw new BadRequestException(
        `You can only change your email once every 15 days. Please wait ${daysLeft} more days.`,
      );
    }

    // Check if username can be changed
    if (
      updateUserDto.username &&
      updateUserDto.username !== user.username &&
      user.lastUsernameChange &&
      user.lastUsernameChange > fifteenDaysAgo
    ) {
      const daysLeft = Math.ceil(
        (user.lastUsernameChange.getTime() - fifteenDaysAgo.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      throw new BadRequestException(
        `You can only change your username once every 15 days. Please wait ${daysLeft} more days.`,
      );
    }

    // Prepare update data
    const updateData: {
      pendingEmail?: string;
      pendingEmailToken?: string;
      pendingEmailTokenExpiry?: Date;
      username?: string;
      lastUsernameChange?: Date;
      displayName?: string;
      description?: string;
      profilePictureUrl?: string;
      profileBackgroundColor?: string;
    } = {};

    // If email is being changed, require verification
    let emailChangeRequested = false;
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      // Check if new email is already taken
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already taken');
      }

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

      updateData.pendingEmail = updateUserDto.email;
      updateData.pendingEmailToken = verificationToken;
      updateData.pendingEmailTokenExpiry = tokenExpiry;
      emailChangeRequested = true;
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      updateData.username = updateUserDto.username;
      updateData.lastUsernameChange = now;
    }
    if (updateUserDto.displayName !== undefined) {
      updateData.displayName = updateUserDto.displayName;
    }
    if (updateUserDto.description !== undefined) {
      updateData.description = updateUserDto.description;
    }
    if (updateUserDto.profilePictureUrl !== undefined) {
      updateData.profilePictureUrl = updateUserDto.profilePictureUrl;
    }
    if (updateUserDto.profileBackgroundColor !== undefined) {
      updateData.profileBackgroundColor = updateUserDto.profileBackgroundColor;
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          description: true,
          profilePictureUrl: true,
          profileBackgroundColor: true,
          createdAt: true,
          lastEmailChange: true,
          lastUsernameChange: true,
          pendingEmail: true,
        },
      });

      // Send email change verification email
      if (
        emailChangeRequested &&
        updateData.pendingEmailToken &&
        updateData.pendingEmail
      ) {
        try {
          await this.emailService.sendEmailChangeVerificationEmail(
            updateData.pendingEmail,
            user.username,
            updateData.pendingEmailToken,
          );
        } catch (error) {
          // Log error but don't fail the update - user will see pending status
          // and can request again if needed
          this.logger.error(
            'Failed to send email change verification email',
            error,
          );
        }
      }

      return {
        ...updatedUser,
        emailChangeRequested,
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username already taken');
      }
      throw error;
    }
  }

  async verifyEmailChange(token: string) {
    // Use constant-time comparison to prevent timing attacks
    const users = await this.prisma.user.findMany({
      where: {
        pendingEmailToken: { not: null },
        pendingEmailTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    // Find user with matching token using constant-time comparison
    const user = users.find((u) => {
      if (!u.pendingEmailToken) return false;
      // Ensure buffer lengths match to prevent timing attacks
      if (u.pendingEmailToken.length !== token.length) return false;
      try {
        return crypto.timingSafeEqual(
          Buffer.from(u.pendingEmailToken),
          Buffer.from(token),
        );
      } catch {
        return false;
      }
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (!user.pendingEmail) {
      throw new BadRequestException('No pending email change');
    }

    // Update user with new email
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        pendingEmailToken: null,
        pendingEmailTokenExpiry: null,
        lastEmailChange: new Date(),
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return {
      message: 'Email changed successfully',
      user: updatedUser,
    };
  }

  async cancelPendingEmailChange(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pendingEmail: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.pendingEmail) {
      throw new BadRequestException('No pending email change to cancel');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pendingEmail: null,
        pendingEmailToken: null,
        pendingEmailTokenExpiry: null,
      },
    });

    return { message: 'Pending email change cancelled' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getUserMarkmaps(userId: string, includeDeleted = false) {
    return this.prisma.markmap.findMany({
      where: {
        authorId: userId,
        deletedAt: includeDeleted ? undefined : null,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeletedMarkmaps(userId: string) {
    return this.prisma.markmap.findMany({
      where: {
        authorId: userId,
        deletedAt: { not: null },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async getUserHistory(userId: string) {
    return this.markmapsService.getUserHistory(userId);
  }

  async getUserPreferences(userId: string) {
    // Get or create user preferences using upsert
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });
  }

  async updateUserPreferences(
    userId: string,
    updatePreferencesDto: {
      darkTheme?: boolean;
      language?: string;
      profilePageVisible?: boolean;
      profilePictureVisible?: boolean;
      emailVisible?: boolean;
      emailComplaintsNotifications?: boolean;
    },
  ) {
    // Use upsert to handle both create and update atomically
    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: updatePreferencesDto,
      create: {
        userId,
        ...updatePreferencesDto,
      },
    });
  }

  /**
   * Get email preferences using a token (for unsubscribe links)
   */
  async getEmailPreferencesByToken(token: string) {
    const userId = this.emailService.verifyPreferencesToken(token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        preferences: {
          select: {
            emailComplaintsNotifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      username: user.username,
      email: user.email,
      emailComplaintsNotifications:
        user.preferences?.emailComplaintsNotifications ?? true,
    };
  }

  /**
   * Update email preferences using a token (for unsubscribe links)
   */
  async updateEmailPreferencesByToken(
    token: string,
    updatePreferencesDto: {
      emailComplaintsNotifications?: boolean;
    },
  ) {
    const userId = this.emailService.verifyPreferencesToken(token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use upsert to handle both create and update atomically
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        emailComplaintsNotifications:
          updatePreferencesDto.emailComplaintsNotifications,
      },
      create: {
        userId,
        emailComplaintsNotifications:
          updatePreferencesDto.emailComplaintsNotifications ?? true,
      },
    });

    return {
      message: 'Email preferences updated successfully',
      emailComplaintsNotifications: preferences.emailComplaintsNotifications,
    };
  }
}

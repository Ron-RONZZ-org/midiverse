import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkmapsService } from '../markmaps/markmaps.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private markmapsService: MarkmapsService,
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
        createdAt: true,
        lastEmailChange: true,
        lastUsernameChange: true,
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
        createdAt: true,
        _count: {
          select: {
            markmaps: true,
            viewHistory: true,
            interactions: true,
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
          createdAt: true,
          lastEmailChange: true,
          lastUsernameChange: true,
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

    return { ...user, isOwnProfile };
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastEmailChange: true, lastUsernameChange: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // Check if email can be changed
    if (
      updateUserDto.email &&
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
      email?: string;
      lastEmailChange?: Date;
      username?: string;
      lastUsernameChange?: Date;
      displayName?: string;
      description?: string;
      profilePictureUrl?: string;
    } = {};
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
      updateData.lastEmailChange = now;
    }
    if (updateUserDto.username) {
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

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          description: true,
          profilePictureUrl: true,
          createdAt: true,
          lastEmailChange: true,
          lastUsernameChange: true,
        },
      });
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

  async getUserMarkmaps(userId: string, includeDeleted = false) {
    return this.prisma.markmap.findMany({
      where: {
        authorId: userId,
        deletedAt: includeDeleted ? undefined : null,
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
      orderBy: { deletedAt: 'desc' },
    });
  }

  async getUserHistory(userId: string) {
    return this.markmapsService.getUserHistory(userId);
  }
}

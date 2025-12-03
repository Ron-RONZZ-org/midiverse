/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MarkmapsService } from '../markmaps/markmaps.service';
import { EmailService } from '../email/email.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let markmapsService: MarkmapsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let emailService: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            markmap: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: MarkmapsService,
          useValue: {
            getUserHistory: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmailChangeVerificationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    markmapsService = module.get<MarkmapsService>(MarkmapsService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfileByUsername', () => {
    it('should return public profile for other users', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        createdAt: new Date(),
        _count: { markmaps: 5, viewHistory: 10, interactions: 15 },
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      const result = await service.getProfileByUsername(
        'testuser',
        'other-user-id',
      );

      expect(result).toEqual({ ...mockUser, isOwnProfile: false });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: expect.any(Object),
      });
    });

    it('should return full profile for own profile', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
        lastEmailChange: null,
        lastUsernameChange: null,
        pendingEmail: null,
        _count: { markmaps: 5, viewHistory: 10, interactions: 15 },
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce({
          id: 'user-1',
          username: 'testuser',
          _count: {},
        } as any)
        .mockResolvedValueOnce(mockUser as any);

      const result = await service.getProfileByUsername('testuser', 'user-1');

      expect(result).toEqual({ ...mockUser, isOwnProfile: true });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getProfileByUsername('nonexistent', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should request email verification when changing email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'old@example.com',
        username: 'testuser',
        lastEmailChange: null,
        lastUsernameChange: null,
      };

      const updatedUser = {
        id: 'user-1',
        email: 'old@example.com',
        username: 'testuser',
        pendingEmail: 'newemail@example.com',
        createdAt: new Date(),
        lastEmailChange: null,
        lastUsernameChange: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(null); // Email not taken
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUser as any);

      const result = await service.updateProfile('user-1', {
        email: 'newemail@example.com',
      });

      expect(result.emailChangeRequested).toBe(true);
      expect(result.pendingEmail).toBe('newemail@example.com');
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email changed too recently', async () => {
      const recentDate = new Date();
      const mockUser = {
        id: 'user-1',
        email: 'old@example.com',
        username: 'testuser',
        lastEmailChange: recentDate,
        lastUsernameChange: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      await expect(
        service.updateProfile('user-1', { email: 'newemail@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if username changed too recently', async () => {
      const recentDate = new Date();
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'oldusername',
        lastEmailChange: null,
        lastUsernameChange: recentDate,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      await expect(
        service.updateProfile('user-1', { username: 'newusername' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email already taken', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'old@example.com',
        username: 'testuser',
        lastEmailChange: null,
        lastUsernameChange: null,
      };

      const existingUser = {
        id: 'user-2',
        email: 'taken@example.com',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(existingUser as any);

      await expect(
        service.updateProfile('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully with valid current password', async () => {
      const mockUser = {
        id: 'user-1',
        password: 'hashed_old_password',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.changePassword('user-1', {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      });

      expect(result.message).toBe('Password changed successfully');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldpassword',
        'hashed_old_password',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        password: 'hashed_old_password',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyEmailChange', () => {
    it('should verify email change with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        pendingEmail: 'newemail@example.com',
        pendingEmailToken: 'valid-token',
        pendingEmailTokenExpiry: new Date(Date.now() + 3600000),
      };

      const updatedUser = {
        id: 'user-1',
        email: 'newemail@example.com',
        username: 'testuser',
      };

      jest
        .spyOn(prismaService.user, 'findMany')
        .mockResolvedValue([mockUser] as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUser as any);

      const result = await service.verifyEmailChange('valid-token');

      expect(result.message).toBe('Email changed successfully');
      expect(result.user.email).toBe('newemail@example.com');
    });

    it('should throw BadRequestException for invalid or expired token', async () => {
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([]);

      await expect(service.verifyEmailChange('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelPendingEmailChange', () => {
    it('should cancel pending email change', async () => {
      const mockUser = {
        id: 'user-1',
        pendingEmail: 'pending@example.com',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);

      const result = await service.cancelPendingEmailChange('user-1');

      expect(result.message).toBe('Pending email change cancelled');
    });

    it('should throw BadRequestException if no pending email change', async () => {
      const mockUser = {
        id: 'user-1',
        pendingEmail: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      await expect(service.cancelPendingEmailChange('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDeletedMarkmaps', () => {
    it('should return deleted markmaps for user', async () => {
      const mockMarkmaps = [
        { id: 'map-1', title: 'Deleted Map', deletedAt: new Date() },
      ];

      jest
        .spyOn(prismaService.markmap, 'findMany')
        .mockResolvedValue(mockMarkmaps as any);

      const result = await service.getDeletedMarkmaps('user-1');

      expect(result).toEqual(mockMarkmaps);
      expect(prismaService.markmap.findMany).toHaveBeenCalledWith({
        where: {
          authorId: 'user-1',
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
    });
  });
});

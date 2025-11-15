/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MarkmapsService } from '../markmaps/markmaps.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let markmapsService: MarkmapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    markmapsService = module.get<MarkmapsService>(MarkmapsService);
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
    it('should update email if allowed', async () => {
      const mockUser = {
        id: 'user-1',
        lastEmailChange: null,
        lastUsernameChange: null,
      };

      const updatedUser = {
        id: 'user-1',
        email: 'newemail@example.com',
        username: 'testuser',
        createdAt: new Date(),
        lastEmailChange: new Date(),
        lastUsernameChange: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUser as any);

      const result = await service.updateProfile('user-1', {
        email: 'newemail@example.com',
      });

      expect(result.email).toBe('newemail@example.com');
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email changed too recently', async () => {
      const recentDate = new Date();
      const mockUser = {
        id: 'user-1',
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

    it('should throw ConflictException if email/username already taken', async () => {
      const mockUser = {
        id: 'user-1',
        lastEmailChange: null,
        lastUsernameChange: null,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockRejectedValue({ code: 'P2002' });

      await expect(
        service.updateProfile('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
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
        orderBy: { deletedAt: 'desc' },
      });
    });
  });
});

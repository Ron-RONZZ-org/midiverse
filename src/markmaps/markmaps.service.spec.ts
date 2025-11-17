import { Test, TestingModule } from '@nestjs/testing';
import { MarkmapsService } from './markmaps.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MarkmapsService', () => {
  let service: MarkmapsService;

  const mockPrismaService = {
    markmap: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    tag: {
      upsert: jest.fn(),
    },
    tagOnMarkmap: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    viewHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    interaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkmapsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MarkmapsService>(MarkmapsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a markmap', async () => {
      const createDto = {
        title: 'Test Markmap',
        text: '# Root\n## Branch',
        language: 'en',
      };
      const userId = 'user-id';
      const expectedResult = {
        id: 'markmap-id',
        ...createDto,
        slug: 'test-markmap',
        authorId: userId,
        tags: [],
      };

      // Mock slug generation - no existing slugs
      mockPrismaService.markmap.findMany.mockResolvedValue([]);
      mockPrismaService.markmap.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.markmap.create).toHaveBeenCalledWith({
        data: { 
          ...createDto, 
          slug: 'test-markmap',
          authorId: userId, 
          tags: undefined 
        },
        include: {
          author: { select: { id: true, username: true } },
          tags: { include: { tag: true } },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a public markmap', async () => {
      const markmapId = 'markmap-id';
      const mockMarkmap = {
        id: markmapId,
        title: 'Test',
        isPublic: true,
        authorId: null,
      };

      mockPrismaService.markmap.findUnique.mockResolvedValue(mockMarkmap);

      const result = await service.findOne(markmapId);

      expect(result).toEqual(mockMarkmap);
    });

    it('should throw NotFoundException if markmap not found', async () => {
      mockPrismaService.markmap.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for private markmap without auth', async () => {
      const mockMarkmap = {
        id: 'markmap-id',
        title: 'Private',
        isPublic: false,
        authorId: 'other-user',
      };

      mockPrismaService.markmap.findUnique.mockResolvedValue(mockMarkmap);

      await expect(service.findOne('markmap-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow author to access private markmap', async () => {
      const userId = 'user-id';
      const mockMarkmap = {
        id: 'markmap-id',
        title: 'Private',
        isPublic: false,
        authorId: userId,
      };

      mockPrismaService.markmap.findUnique.mockResolvedValue(mockMarkmap);
      mockPrismaService.viewHistory.create.mockResolvedValue({});

      const result = await service.findOne('markmap-id', userId);

      expect(result).toEqual(mockMarkmap);
      expect(mockPrismaService.viewHistory.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update own markmap', async () => {
      const userId = 'user-id';
      const markmapId = 'markmap-id';
      const updateDto = { title: 'Updated' };
      const existingMarkmap = { id: markmapId, authorId: userId };
      const updatedMarkmap = { ...existingMarkmap, ...updateDto };

      mockPrismaService.markmap.findUnique.mockResolvedValue(existingMarkmap);
      mockPrismaService.markmap.update.mockResolvedValue(updatedMarkmap);

      const result = await service.update(markmapId, updateDto, userId);

      expect(result).toEqual(updatedMarkmap);
    });

    it('should throw ForbiddenException when updating others markmap', async () => {
      const existingMarkmap = { id: 'markmap-id', authorId: 'other-user' };

      mockPrismaService.markmap.findUnique.mockResolvedValue(existingMarkmap);

      await expect(
        service.update('markmap-id', { title: 'Updated' }, 'user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('search', () => {
    it('should search markmaps by query', async () => {
      const searchDto = { query: 'test' };
      const mockResults = [
        { id: '1', title: 'Test 1', isPublic: true },
        { id: '2', title: 'Test 2', isPublic: true },
      ];

      mockPrismaService.markmap.findMany.mockResolvedValue(mockResults);

      const result = await service.search(searchDto);

      expect(result).toEqual(mockResults);
      expect(mockPrismaService.markmap.findMany).toHaveBeenCalled();
    });

    it('should filter by language', async () => {
      const searchDto = { language: 'en' };
      mockPrismaService.markmap.findMany.mockResolvedValue([]);

      await service.search(searchDto);

      expect(mockPrismaService.markmap.findMany).toHaveBeenCalled();
      const calls = mockPrismaService.markmap.findMany.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('createInteraction', () => {
    it('should create an interaction', async () => {
      const markmapId = 'markmap-id';
      const userId = 'user-id';
      const interactionDto = { type: 'expand', metadata: { nodeId: 'node-1' } };
      const mockMarkmap = { id: markmapId };
      const mockInteraction = { id: 'interaction-id', ...interactionDto };

      mockPrismaService.markmap.findUnique.mockResolvedValue(mockMarkmap);
      mockPrismaService.interaction.create.mockResolvedValue(mockInteraction);

      const result = await service.createInteraction(
        markmapId,
        interactionDto,
        userId,
      );

      expect(result).toEqual(mockInteraction);
    });

    it('should throw NotFoundException if markmap not found', async () => {
      mockPrismaService.markmap.findUnique.mockResolvedValue(null);

      await expect(
        service.createInteraction('non-existent', { type: 'expand' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsernameAndSlug', () => {
    const mockUser = {
      id: 'user-id',
      username: 'testuser',
    };

    const mockMarkmap = {
      id: 'markmap-id',
      title: 'Test Markmap',
      slug: 'test-markmap',
      text: '# Test',
      isPublic: true,
      authorId: 'user-id',
      deletedAt: null,
      author: mockUser,
      tags: [],
    };

    beforeEach(() => {
      mockPrismaService.user = {
        findUnique: jest.fn(),
      };
      mockPrismaService.markmap.findFirst = jest.fn();
    });

    it('should find markmap by username and slug', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.markmap.findFirst.mockResolvedValue(mockMarkmap);
      mockPrismaService.viewHistory.create.mockResolvedValue({});

      const result = await service.findByUsernameAndSlug(
        'testuser',
        'test-markmap',
        'user-id',
      );

      expect(result).toEqual(mockMarkmap);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: { id: true, username: true },
      });
      expect(mockPrismaService.markmap.findFirst).toHaveBeenCalledWith({
        where: {
          authorId: 'user-id',
          slug: 'test-markmap',
          deletedAt: null,
        },
        include: {
          author: { select: { id: true, username: true } },
          tags: { include: { tag: true } },
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findByUsernameAndSlug('nonexistent', 'test-markmap'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if markmap not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.markmap.findFirst.mockResolvedValue(null);

      await expect(
        service.findByUsernameAndSlug('testuser', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private markmap without auth', async () => {
      const privateMarkmap = { ...mockMarkmap, isPublic: false };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.markmap.findFirst.mockResolvedValue(privateMarkmap);

      await expect(
        service.findByUsernameAndSlug('testuser', 'test-markmap'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow author to access private markmap', async () => {
      const privateMarkmap = { ...mockMarkmap, isPublic: false };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.markmap.findFirst.mockResolvedValue(privateMarkmap);
      mockPrismaService.viewHistory.create.mockResolvedValue({});

      const result = await service.findByUsernameAndSlug(
        'testuser',
        'test-markmap',
        'user-id',
      );

      expect(result).toEqual(privateMarkmap);
    });
  });
});

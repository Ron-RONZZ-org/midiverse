import { Test, TestingModule } from '@nestjs/testing';
import { KeynodesService } from './keynodes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('KeynodesService', () => {
  let service: KeynodesService;

  const mockPrismaService = {
    keynode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeynodesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<KeynodesService>(KeynodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a keynode', async () => {
      const createDto = {
        name: 'volcano',
        category: 'geological_form',
        parentId: 'parent-id',
      };
      const expectedResult = {
        id: 'keynode-id',
        ...createDto,
        status: 'unverified',
        childNodeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: undefined,
        parent: {
          id: 'parent-id',
          name: 'mountain',
          category: 'geological_form',
        },
        children: [],
        createdBy: null,
      };

      mockPrismaService.keynode.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'unverified',
          createdById: undefined,
        },
        include: {
          parent: { select: { id: true, name: true, category: true } },
          children: { select: { id: true, name: true, category: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });
    });

    it('should create a verified keynode for content managers', async () => {
      const createDto = {
        name: 'verified-volcano',
        category: 'geological_form',
        parentId: 'parent-id',
      };
      const expectedResult = {
        id: 'keynode-id',
        ...createDto,
        status: 'verified',
        childNodeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-id',
        parent: null,
        children: [],
        createdBy: { id: 'user-id', username: 'contentmanager' },
      };

      mockPrismaService.keynode.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto, 'user-id', 'content_manager');

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'verified',
          createdById: 'user-id',
        },
        include: {
          parent: { select: { id: true, name: true, category: true } },
          children: { select: { id: true, name: true, category: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });
    });

    it('should create a keynode with new categories', async () => {
      const testCases = [
        { name: 'Mount Everest', category: 'geological_form' },
        { name: 'H2O', category: 'chemical' },
        { name: 'Mars', category: 'astronomical_entity' },
      ];

      for (const testCase of testCases) {
        mockPrismaService.keynode.create.mockResolvedValue({
          id: 'keynode-id',
          ...testCase,
          childNodeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: null,
          children: [],
        });

        const result = await service.create(testCase);
        expect(result.category).toBe(testCase.category);
      }
    });
  });

  describe('findOne', () => {
    it('should return a keynode', async () => {
      const keynodeId = 'keynode-id';
      const expectedResult = {
        id: keynodeId,
        name: 'volcano',
        category: 'geological_form',
        childNodeCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: 'parent-id',
        parent: {
          id: 'parent-id',
          name: 'mountain',
          category: 'geological_form',
        },
        children: [],
      };

      mockPrismaService.keynode.findUnique.mockResolvedValue(expectedResult);

      const result = await service.findOne(keynodeId);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.findUnique).toHaveBeenCalledWith({
        where: { id: keynodeId },
        include: {
          parent: { select: { id: true, name: true, category: true } },
          children: { select: { id: true, name: true, category: true } },
        },
      });
    });

    it('should throw NotFoundException if keynode not found', async () => {
      const keynodeId = 'non-existent-id';
      mockPrismaService.keynode.findUnique.mockResolvedValue(null);

      await expect(service.findOne(keynodeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSuggestions', () => {
    it('should return keynodes matching query', async () => {
      const query = 'vol';
      const expectedResults = [
        {
          id: 'keynode-1',
          name: 'volcano',
          category: 'geological_form',
          childNodeCount: 5,
          parent: { id: 'parent-id', name: 'mountain' },
        },
        {
          id: 'keynode-2',
          name: 'volleyball',
          category: 'abstract_concept',
          childNodeCount: 2,
          parent: null,
        },
      ];

      mockPrismaService.keynode.findMany.mockResolvedValue(expectedResults);

      const result = await service.getSuggestions(query);

      expect(result).toEqual(expectedResults);
      expect(mockPrismaService.keynode.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        orderBy: [{ childNodeCount: 'desc' }, { name: 'asc' }],
        take: 10,
        select: {
          id: true,
          name: true,
          category: true,
          childNodeCount: true,
          parent: { select: { id: true, name: true } },
        },
      });
    });

    it('should return all keynodes when no query provided', async () => {
      const expectedResults = [
        {
          id: 'keynode-1',
          name: 'volcano',
          category: 'geological_form',
          childNodeCount: 5,
          parent: null,
        },
      ];

      mockPrismaService.keynode.findMany.mockResolvedValue(expectedResults);

      const result = await service.getSuggestions();

      expect(result).toEqual(expectedResults);
      expect(mockPrismaService.keynode.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ childNodeCount: 'desc' }, { name: 'asc' }],
        take: 10,
        select: {
          id: true,
          name: true,
          category: true,
          childNodeCount: true,
          parent: { select: { id: true, name: true } },
        },
      });
    });
  });

  describe('updateChildNodeCount', () => {
    it('should increment child node count', async () => {
      const keynodeId = 'keynode-id';
      const increment = 1;
      const expectedResult = {
        id: keynodeId,
        name: 'volcano',
        category: 'geological_form',
        childNodeCount: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
      };

      mockPrismaService.keynode.update.mockResolvedValue(expectedResult);

      const result = await service.updateChildNodeCount(keynodeId, increment);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.update).toHaveBeenCalledWith({
        where: { id: keynodeId },
        data: {
          childNodeCount: {
            increment,
          },
        },
      });
    });

    it('should decrement child node count', async () => {
      const keynodeId = 'keynode-id';
      const decrement = -1;
      const expectedResult = {
        id: keynodeId,
        name: 'volcano',
        category: 'geological_form',
        childNodeCount: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
      };

      mockPrismaService.keynode.update.mockResolvedValue(expectedResult);

      const result = await service.updateChildNodeCount(keynodeId, decrement);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.update).toHaveBeenCalledWith({
        where: { id: keynodeId },
        data: {
          childNodeCount: {
            increment: decrement,
          },
        },
      });
    });
  });

  describe('findByName', () => {
    it('should return a keynode by name', async () => {
      const name = 'volcano';
      const expectedResult = {
        id: 'keynode-id',
        name,
        category: 'geological_form',
        childNodeCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: 'parent-id',
        parent: {
          id: 'parent-id',
          name: 'mountain',
          category: 'geological_form',
        },
        children: [],
      };

      mockPrismaService.keynode.findUnique.mockResolvedValue(expectedResult);

      const result = await service.findByName(name);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.findUnique).toHaveBeenCalledWith({
        where: { name },
        include: {
          parent: { select: { id: true, name: true, category: true } },
          children: { select: { id: true, name: true, category: true } },
        },
      });
    });

    it('should return null if keynode not found', async () => {
      const name = 'non-existent';
      mockPrismaService.keynode.findUnique.mockResolvedValue(null);

      const result = await service.findByName(name);

      expect(result).toBeNull();
    });
  });

  describe('getHierarchy', () => {
    it('should return markdown hierarchy without reference counts', async () => {
      const mockKeynodes = [
        {
          id: 'root-1',
          name: 'Volcano',
          category: 'geological_form',
          parentId: null,
          _count: { markmaps: 3 },
        },
        {
          id: 'child-1',
          name: 'Mount Vesuvius',
          category: 'geological_form',
          parentId: 'root-1',
          _count: { markmaps: 2 },
        },
        {
          id: 'root-2',
          name: 'Water',
          category: 'chemical',
          parentId: null,
          _count: { markmaps: 5 },
        },
      ];

      mockPrismaService.keynode.findMany.mockResolvedValue(mockKeynodes);

      const result = await service.getHierarchy(false);

      expect(result).toContain('# Keynodes');
      expect(result).toContain('## chemical');
      expect(result).toContain('## geological form');
      expect(result).toContain('Water');
      expect(result).toContain('Volcano');
      expect(result).toContain('Mount Vesuvius');
      expect(result).not.toContain('(3)');
      expect(result).not.toContain('(5)');
    });

    it('should return markdown hierarchy with reference counts', async () => {
      const mockKeynodes = [
        {
          id: 'root-1',
          name: 'Volcano',
          category: 'geological_form',
          parentId: null,
          _count: { markmaps: 3 },
        },
        {
          id: 'child-1',
          name: 'Mount Vesuvius',
          category: 'geological_form',
          parentId: 'root-1',
          _count: { markmaps: 2 },
        },
      ];

      mockPrismaService.keynode.findMany.mockResolvedValue(mockKeynodes);

      const result = await service.getHierarchy(true);

      expect(result).toContain('# Keynodes');
      expect(result).toContain('(5)'); // 3 + 2 = 5 total for Volcano
      expect(result).toContain('(2)'); // 2 for Mount Vesuvius
    });

    it('should handle empty keynodes list', async () => {
      mockPrismaService.keynode.findMany.mockResolvedValue([]);

      const result = await service.getHierarchy(false);

      expect(result).toBe('# Keynodes\n');
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories in use', async () => {
      const mockCategories = [
        { category: 'astronomical_entity' },
        { category: 'chemical' },
        { category: 'geological_form' },
      ];

      mockPrismaService.keynode.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toEqual([
        'astronomical_entity',
        'chemical',
        'geological_form',
      ]);
      expect(mockPrismaService.keynode.findMany).toHaveBeenCalledWith({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });
    });
  });
});

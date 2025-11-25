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
        category: 'geographical_location',
        parentId: 'parent-id',
      };
      const expectedResult = {
        id: 'keynode-id',
        ...createDto,
        childNodeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: {
          id: 'parent-id',
          name: 'mountain',
          category: 'geographical_location',
        },
        children: [],
      };

      mockPrismaService.keynode.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.keynode.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          parent: { select: { id: true, name: true, category: true } },
          children: { select: { id: true, name: true, category: true } },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a keynode', async () => {
      const keynodeId = 'keynode-id';
      const expectedResult = {
        id: keynodeId,
        name: 'volcano',
        category: 'geographical_location',
        childNodeCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: 'parent-id',
        parent: {
          id: 'parent-id',
          name: 'mountain',
          category: 'geographical_location',
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
          category: 'geographical_location',
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
          category: 'geographical_location',
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
        category: 'geographical_location',
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
        category: 'geographical_location',
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
        category: 'geographical_location',
        childNodeCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: 'parent-id',
        parent: {
          id: 'parent-id',
          name: 'mountain',
          category: 'geographical_location',
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
});

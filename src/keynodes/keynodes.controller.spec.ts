import { Test, TestingModule } from '@nestjs/testing';
import { KeynodesController } from './keynodes.controller';
import { KeynodesService } from './keynodes.service';
import { KEYNODE_CATEGORIES } from './dto/create-keynode.dto';

describe('KeynodesController', () => {
  let controller: KeynodesController;

  const mockKeynodesService = {
    create: jest.fn(),
    findOne: jest.fn(),
    getSuggestions: jest.fn(),
    getHierarchy: jest.fn(),
    getCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeynodesController],
      providers: [
        {
          provide: KeynodesService,
          useValue: mockKeynodesService,
        },
      ],
    }).compile();

    controller = module.get<KeynodesController>(KeynodesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
        parent: null,
        children: [],
        createdBy: null,
      };

      mockKeynodesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto, undefined);

      expect(result).toEqual(expectedResult);
      expect(mockKeynodesService.create).toHaveBeenCalledWith(createDto, undefined, undefined);
    });
  });

  describe('getSuggestions', () => {
    it('should return keynode suggestions', async () => {
      const query = 'vol';
      const expectedResults = [
        {
          id: 'keynode-1',
          name: 'volcano',
          category: 'geological_form',
          childNodeCount: 5,
          parent: null,
        },
      ];

      mockKeynodesService.getSuggestions.mockResolvedValue(expectedResults);

      const result = await controller.getSuggestions({ query });

      expect(result).toEqual(expectedResults);
      expect(mockKeynodesService.getSuggestions).toHaveBeenCalledWith(query);
    });
  });

  describe('getHierarchy', () => {
    it('should return hierarchy without reference counts by default', async () => {
      const expectedMarkdown = '# Keynodes\n## geological form\n### Volcano\n';
      mockKeynodesService.getHierarchy.mockResolvedValue(expectedMarkdown);

      const result = await controller.getHierarchy();

      expect(result).toBe(expectedMarkdown);
      expect(mockKeynodesService.getHierarchy).toHaveBeenCalledWith(false);
    });

    it('should return hierarchy with reference counts when showReferenceCounts=true', async () => {
      const expectedMarkdown =
        '# Keynodes\n## geological form (5)\n### Volcano (5)\n';
      mockKeynodesService.getHierarchy.mockResolvedValue(expectedMarkdown);

      const result = await controller.getHierarchy('true');

      expect(result).toBe(expectedMarkdown);
      expect(mockKeynodesService.getHierarchy).toHaveBeenCalledWith(true);
    });

    it('should return hierarchy with reference counts when showReferenceCounts=1', async () => {
      const expectedMarkdown =
        '# Keynodes\n## geological form (5)\n### Volcano (5)\n';
      mockKeynodesService.getHierarchy.mockResolvedValue(expectedMarkdown);

      const result = await controller.getHierarchy('1');

      expect(result).toBe(expectedMarkdown);
      expect(mockKeynodesService.getHierarchy).toHaveBeenCalledWith(true);
    });
  });

  describe('getCategories', () => {
    it('should return available and in-use categories', async () => {
      const inUseCategories = ['geological_form', 'chemical'];
      mockKeynodesService.getCategories.mockResolvedValue(inUseCategories);

      const result = await controller.getCategories();

      expect(result.available).toEqual(KEYNODE_CATEGORIES);
      expect(result.inUse).toEqual(inUseCategories);
    });
  });

  describe('findOne', () => {
    it('should return a keynode by id', async () => {
      const keynodeId = 'keynode-id';
      const expectedResult = {
        id: keynodeId,
        name: 'volcano',
        category: 'geological_form',
        childNodeCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        parentId: null,
        parent: null,
        children: [],
      };

      mockKeynodesService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(keynodeId);

      expect(result).toEqual(expectedResult);
      expect(mockKeynodesService.findOne).toHaveBeenCalledWith(keynodeId);
    });
  });
});

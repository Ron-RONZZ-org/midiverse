import { Test, TestingModule } from '@nestjs/testing';
import { KeynodesController } from './keynodes.controller';
import { KeynodesService } from './keynodes.service';

describe('KeynodesController', () => {
  let controller: KeynodesController;

  const mockKeynodesService = {
    create: jest.fn(),
    findOne: jest.fn(),
    getSuggestions: jest.fn(),
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
        category: 'geographical_location',
        parentId: 'parent-id',
      };
      const expectedResult = {
        id: 'keynode-id',
        ...createDto,
        childNodeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
      };

      mockKeynodesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockKeynodesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getSuggestions', () => {
    it('should return keynode suggestions', async () => {
      const query = 'vol';
      const expectedResults = [
        {
          id: 'keynode-1',
          name: 'volcano',
          category: 'geographical_location',
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

  describe('findOne', () => {
    it('should return a keynode by id', async () => {
      const keynodeId = 'keynode-id';
      const expectedResult = {
        id: keynodeId,
        name: 'volcano',
        category: 'geographical_location',
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

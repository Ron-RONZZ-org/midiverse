import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { KeynodesService } from './keynodes.service';
import { CreateKeynodeDto, KEYNODE_CATEGORIES } from './dto/create-keynode.dto';
import { GetKeynoteSuggestionsDto } from './dto/get-keynode-suggestions.dto';

@Controller('keynodes')
export class KeynodesController {
  constructor(private readonly keynodesService: KeynodesService) {}

  @Post()
  create(@Body(ValidationPipe) createKeynodeDto: CreateKeynodeDto) {
    return this.keynodesService.create(createKeynodeDto);
  }

  @Get('suggestions')
  getSuggestions(@Query(ValidationPipe) dto: GetKeynoteSuggestionsDto) {
    return this.keynodesService.getSuggestions(dto.query);
  }

  @Get('hierarchy')
  getHierarchy(
    @Query('showReferenceCounts') showReferenceCounts?: string,
  ): Promise<string> {
    const showCounts =
      showReferenceCounts === 'true' || showReferenceCounts === '1';
    return this.keynodesService.getHierarchy(showCounts);
  }

  @Get('categories')
  async getCategories(): Promise<{
    available: readonly string[];
    inUse: string[];
  }> {
    return {
      available: KEYNODE_CATEGORIES,
      inUse: await this.keynodesService.getCategories(),
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.keynodesService.findOne(id);
  }
}

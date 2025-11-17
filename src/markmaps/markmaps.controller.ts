import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MarkmapsService } from './markmaps.service';
import { CreateMarkmapDto } from './dto/create-markmap.dto';
import { UpdateMarkmapDto } from './dto/update-markmap.dto';
import { SearchMarkmapDto } from './dto/search-markmap.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { GetTagSuggestionsDto } from './dto/get-tag-suggestions.dto';
import { GetTagStatisticsDto } from './dto/get-tag-statistics.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserFromToken } from '../common/interfaces/auth.interface';

interface RequestWithUser extends Request {
  user?: UserFromToken;
}

@Controller('markmaps')
export class MarkmapsController {
  constructor(private readonly markmapsService: MarkmapsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body(ValidationPipe) createMarkmapDto: CreateMarkmapDto,
    @CurrentUser() user: UserFromToken,
  ) {
    return this.markmapsService.create(createMarkmapDto, user.id);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    return this.markmapsService.findAll(userId);
  }

  @Get('search')
  search(
    @Query(ValidationPipe) searchDto: SearchMarkmapDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.markmapsService.search(searchDto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user?.id;
    return this.markmapsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMarkmapDto: UpdateMarkmapDto,
    @CurrentUser() user: UserFromToken,
  ) {
    return this.markmapsService.update(id, updateMarkmapDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.markmapsService.remove(id, user.id);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  duplicate(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.markmapsService.duplicate(id, user.id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  restore(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.markmapsService.restore(id, user.id);
  }

  @Post(':id/interactions')
  createInteraction(
    @Param('id') id: string,
    @Body(ValidationPipe) createInteractionDto: CreateInteractionDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.markmapsService.createInteraction(
      id,
      createInteractionDto,
      userId,
    );
  }

  @Get('tags/suggestions')
  getTagSuggestions(@Query(ValidationPipe) dto: GetTagSuggestionsDto) {
    return this.markmapsService.getTagSuggestions(dto.query);
  }

  @Get('tags/statistics')
  getTagStatistics(@Query(ValidationPipe) dto: GetTagStatisticsDto) {
    return this.markmapsService.getTagStatistics(dto.timeFilter);
  }

  @Get('tags/trend/:tagName')
  getTagHistoricalTrend(@Param('tagName') tagName: string) {
    return this.markmapsService.getTagHistoricalTrend(tagName);
  }

  // Human-friendly URL endpoints - must be last to avoid conflicts
  @Get(':username/:slug/fullscreen')
  findBySlugFullscreen(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.markmapsService.findByUsernameAndSlug(username, slug, userId);
  }

  @Get(':username/:slug')
  findBySlug(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.markmapsService.findByUsernameAndSlug(username, slug, userId);
  }
}

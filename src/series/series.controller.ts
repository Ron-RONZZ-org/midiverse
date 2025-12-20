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
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserFromToken } from '../common/interfaces/auth.interface';

interface RequestWithUser extends Request {
  user?: UserFromToken;
}

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body(ValidationPipe) createSeriesDto: CreateSeriesDto,
    @CurrentUser() user: UserFromToken,
  ) {
    return this.seriesService.create(createSeriesDto, user.id);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    return this.seriesService.findAll(userId);
  }

  @Get('suggestions')
  @UseGuards(OptionalJwtAuthGuard)
  async getSeriesSuggestions(
    @Req() req: RequestWithUser,
    @Query('author') author?: string,
  ) {
    if (!author) {
      return [];
    }
    
    const userId = req.user?.id;
    const seriesList = await this.seriesService.findByUsername(author, userId);
    
    // Return simplified list with just id, name for suggestions
    return seriesList.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      markmapCount: s._count?.markmaps || 0,
    }));
  }

  @Get('user/:username')
  @UseGuards(OptionalJwtAuthGuard)
  findByUsername(
    @Param('username') username: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.seriesService.findByUsername(username, userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const userId = req.user?.id;
    return this.seriesService.findOne(id, userId);
  }

  @Get(':username/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  findBySlug(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
    return this.seriesService.findBySlug(username, slug, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSeriesDto: UpdateSeriesDto,
    @CurrentUser() user: UserFromToken,
  ) {
    return this.seriesService.update(id, updateSeriesDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.seriesService.remove(id, user.id);
  }
}

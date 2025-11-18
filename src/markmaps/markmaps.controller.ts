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
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
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

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    const html = await this.markmapsService.generateDownloadHtml(id, userId);
    const markmap = await this.markmapsService.findOne(id, userId);

    const filename = `${markmap.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async importMarkmaps(
    @UploadedFiles() files: Array<any>,
    @CurrentUser() user: UserFromToken,
  ) {
    if (!files || files.length === 0) {
      return { error: 'No files provided' };
    }

    const imported: Array<{
      filename: string;
      id?: string;
      title?: string;
      error?: string;
    }> = [];

    for (const file of files) {
      try {
        // Validate file type
        const allowedExtensions = ['.html', '.htm', '.md', '.markdown', '.txt'];
        const fileExt = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];

        if (!fileExt || !allowedExtensions.includes(fileExt)) {
          imported.push({
            filename: file.originalname,
            error:
              'Invalid file type. Only HTML, Markdown, and TXT files are allowed.',
          });
          continue;
        }

        const content = file.buffer.toString('utf-8');
        const parsed = await this.markmapsService.parseImportedFile(
          file.originalname,
          content,
        );

        // Create the markmap
        const created = await this.markmapsService.create(
          parsed as CreateMarkmapDto,
          user.id,
        );

        imported.push({
          filename: file.originalname,
          id: created.id,
          title: created.title,
        });
      } catch (error) {
        imported.push({
          filename: file.originalname,
          error: error.message || 'Failed to import',
        });
      }
    }

    return {
      success: true,
      count: imported.filter((i) => !i.error).length,
      total: files.length,
      imported,
    };
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

  @Get('languages/suggestions')
  getLanguageSuggestions(@Query('query') query?: string) {
    return this.markmapsService.getLanguageSuggestions(query);
  }

  @Get('authors/suggestions')
  getAuthorSuggestions(@Query('query') query?: string) {
    return this.markmapsService.getAuthorSuggestions(query);
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

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
import { MarkmapsService } from './markmaps.service';
import { CreateMarkmapDto } from './dto/create-markmap.dto';
import { UpdateMarkmapDto } from './dto/update-markmap.dto';
import { SearchMarkmapDto } from './dto/search-markmap.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('markmaps')
export class MarkmapsController {
  constructor(private readonly markmapsService: MarkmapsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body(ValidationPipe) createMarkmapDto: CreateMarkmapDto,
    @CurrentUser() user: any,
  ) {
    return this.markmapsService.create(createMarkmapDto, user.id);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user?.id;
    return this.markmapsService.findAll(userId);
  }

  @Get('search')
  search(@Query(ValidationPipe) searchDto: SearchMarkmapDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.markmapsService.search(searchDto, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.markmapsService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateMarkmapDto: UpdateMarkmapDto,
    @CurrentUser() user: any,
  ) {
    return this.markmapsService.update(id, updateMarkmapDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.markmapsService.remove(id, user.id);
  }

  @Post(':id/interactions')
  createInteraction(
    @Param('id') id: string,
    @Body(ValidationPipe) createInteractionDto: CreateInteractionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.markmapsService.createInteraction(id, createInteractionDto, userId);
  }
}

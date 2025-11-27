import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ValidationPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KeynodesService } from './keynodes.service';
import { CreateKeynodeDto, KEYNODE_CATEGORIES } from './dto/create-keynode.dto';
import { GetKeynoteSuggestionsDto } from './dto/get-keynode-suggestions.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { UserFromToken } from '../common/interfaces/auth.interface';

@Controller('keynodes')
export class KeynodesController {
  constructor(private readonly keynodesService: KeynodesService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard, ActiveUserGuard)
  create(
    @Body(ValidationPipe) createKeynodeDto: CreateKeynodeDto,
    @CurrentUser() user?: UserFromToken,
  ) {
    return this.keynodesService.create(createKeynodeDto, user?.id, user?.role);
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

  /**
   * Update the keynode hierarchy from markdown (admin only)
   */
  @Put('hierarchy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrator')
  updateHierarchy(@Body() body: { markdown: string }) {
    return this.keynodesService.updateHierarchy(body.markdown);
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

  /**
   * Get unverified keynodes (content managers and admins)
   */
  @Get('unverified')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  findUnverified() {
    return this.keynodesService.findUnverified();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.keynodesService.findOne(id);
  }

  /**
   * Approve an unverified keynode (content managers and admins)
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  approve(@Param('id') id: string) {
    return this.keynodesService.approve(id);
  }

  /**
   * Edit and approve an unverified keynode (content managers and admins)
   */
  @Patch(':id/edit-approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  editAndApprove(
    @Param('id') id: string,
    @Body(ValidationPipe)
    data: { name?: string; category?: string; parentId?: string | null },
  ) {
    return this.keynodesService.editAndApprove(id, data);
  }

  /**
   * Reject as duplicate (content managers and admins)
   */
  @Patch(':id/reject-duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  rejectAsDuplicate(
    @Param('id') id: string,
    @Body('existingKeynodeId') existingKeynodeId: string,
  ) {
    return this.keynodesService.rejectAsDuplicate(id, existingKeynodeId);
  }

  /**
   * Reject as irrelevant (content managers and admins)
   */
  @Delete(':id/reject-irrelevant')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  rejectAsIrrelevant(@Param('id') id: string) {
    return this.keynodesService.rejectAsIrrelevant(id);
  }

  /**
   * Update keynode (admin only - for hierarchy editing)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrator')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe)
    data: { name?: string; category?: string; parentId?: string | null },
  ) {
    return this.keynodesService.update(id, data);
  }

  /**
   * Delete keynode (admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrator')
  delete(@Param('id') id: string) {
    return this.keynodesService.delete(id);
  }
}

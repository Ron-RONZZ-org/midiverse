import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import type { UserFromToken } from '../common/interfaces/auth.interface';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  /**
   * Create a complaint for a markmap
   * Can be done by authenticated users or anonymously
   */
  @Post('markmaps/:markmapId')
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Param('markmapId') markmapId: string,
    @Body() createComplaintDto: CreateComplaintDto,
    @CurrentUser() user?: UserFromToken,
  ) {
    return this.complaintsService.create(
      markmapId,
      createComplaintDto,
      user?.id,
    );
  }

  /**
   * Get all pending complaints (content managers and admins)
   */
  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  findPending() {
    return this.complaintsService.findPending();
  }

  /**
   * Get all appealed complaints (admins only)
   */
  @Get('appealed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('administrator')
  findAppealed() {
    return this.complaintsService.findAppealed();
  }

  /**
   * Get markmaps pending review (edited after retirement)
   */
  @Get('pending-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  findPendingReview() {
    return this.complaintsService.findPendingReview();
  }

  /**
   * Get a specific complaint (content managers and admins)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  findOne(@Param('id') id: string) {
    return this.complaintsService.findOne(id);
  }

  /**
   * Resolve a complaint (content managers and admins)
   */
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  resolve(
    @Param('id') id: string,
    @Body() resolveComplaintDto: ResolveComplaintDto,
    @CurrentUser() user: UserFromToken,
  ) {
    return this.complaintsService.resolve(id, resolveComplaintDto, user.id);
  }

  /**
   * Review an edited markmap (reinstate or send back for further edits)
   */
  @Patch('markmaps/:markmapId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('content_manager', 'administrator')
  reviewMarkmap(
    @Param('markmapId') markmapId: string,
    @Body()
    body: { action: 'reinstate' | 'needs_edit'; resolution: string },
    @CurrentUser() user: UserFromToken,
  ) {
    return this.complaintsService.reviewMarkmap(
      markmapId,
      body.action,
      body.resolution,
      user.id,
    );
  }

  /**
   * Appeal a dismissed complaint (original reporter only)
   */
  @Post(':id/appeal')
  @UseGuards(JwtAuthGuard)
  appeal(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.complaintsService.appeal(id, user.id);
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateUserRoleDto, SuspendUserDto } from './dto/user-management.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrator')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * List all users with pagination and filtering
   */
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 20,
      search,
      role,
      status,
    );
  }

  /**
   * Get a single user's details
   */
  @Get('users/:userId')
  getUser(@Param('userId') userId: string) {
    return this.adminService.getUser(userId);
  }

  /**
   * Update a user's role
   */
  @Patch('users/:userId/role')
  updateUserRole(
    @Param('userId') userId: string,
    @Body(ValidationPipe) updateRoleDto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, updateRoleDto);
  }

  /**
   * Suspend a user
   */
  @Post('users/:userId/suspend')
  suspendUser(
    @Param('userId') userId: string,
    @Body(ValidationPipe) suspendDto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(userId, suspendDto);
  }

  /**
   * Reinstate a suspended user
   */
  @Post('users/:userId/reinstate')
  reinstateUser(@Param('userId') userId: string) {
    return this.adminService.reinstateUser(userId);
  }
}

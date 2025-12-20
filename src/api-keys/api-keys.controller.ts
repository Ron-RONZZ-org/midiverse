import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserFromToken } from '../common/interfaces/auth.interface';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @CurrentUser() user: UserFromToken,
  ) {
    return this.apiKeysService.create(user.id, createApiKeyDto);
  }

  @Get()
  findAll(@CurrentUser() user: UserFromToken) {
    return this.apiKeysService.findAll(user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserFromToken) {
    return this.apiKeysService.remove(id, user.id);
  }
}

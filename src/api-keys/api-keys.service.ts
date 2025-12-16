import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new API key for a user
   */
  async create(userId: string, createApiKeyDto: CreateApiKeyDto) {
    // Generate a random API key
    const rawKey = this.generateApiKey();
    const hashedKey = await bcrypt.hash(rawKey, 10);
    const prefix = rawKey.substring(0, 8);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: createApiKeyDto.name,
        key: hashedKey,
        prefix: prefix,
        permission: createApiKeyDto.permission,
        expiresAt: createApiKeyDto.expiresAt
          ? new Date(createApiKeyDto.expiresAt)
          : null,
        userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        permission: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    // Return the raw key only once
    return {
      ...apiKey,
      key: rawKey,
    };
  }

  /**
   * Get all API keys for a user (without the actual key)
   */
  async findAll(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        permission: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete an API key
   */
  async remove(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.userId !== userId) {
      throw new ForbiddenException('You can only delete your own API keys');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    return { message: 'API key deleted successfully' };
  }

  /**
   * Validate an API key and return the user
   */
  async validateApiKey(rawKey: string) {
    if (!rawKey || !rawKey.startsWith('mk_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Find all API keys (we need to check the hash for each)
    // First, let's try to optimize by getting keys with matching prefix
    const prefix = rawKey.substring(0, 8);
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        prefix,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            status: true,
          },
        },
      },
    });

    // Check each key with matching prefix
    for (const apiKey of apiKeys) {
      const isValid = await bcrypt.compare(rawKey, apiKey.key);
      if (isValid) {
        // Check if user is active
        if (apiKey.user.status !== 'active') {
          throw new UnauthorizedException('User account is not active');
        }

        // Update lastUsedAt
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          user: apiKey.user,
          permission: apiKey.permission,
        };
      }
    }

    throw new UnauthorizedException('Invalid API key');
  }

  /**
   * Generate a random API key with prefix
   */
  private generateApiKey(): string {
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64url');
    return `mk_${key}`;
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarkmapDto } from './dto/create-markmap.dto';
import { UpdateMarkmapDto } from './dto/update-markmap.dto';
import { SearchMarkmapDto } from './dto/search-markmap.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class MarkmapsService {
  constructor(private prisma: PrismaService) {}

  async create(createMarkmapDto: CreateMarkmapDto, userId?: string) {
    return this.prisma.markmap.create({
      data: {
        ...createMarkmapDto,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });
  }

  async findAll(userId?: string) {
    const where = userId
      ? { OR: [{ isPublic: true }, { authorId: userId }] }
      : { isPublic: true };

    return this.prisma.markmap.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    if (!markmap.isPublic && (!userId || markmap.authorId !== userId)) {
      throw new ForbiddenException('Access denied');
    }

    // Track view history if user is logged in
    if (userId) {
      await this.prisma.viewHistory.create({
        data: {
          userId,
          markmapId: id,
        },
      });
    }

    return markmap;
  }

  async update(id: string, updateMarkmapDto: UpdateMarkmapDto, userId: string) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    if (markmap.authorId !== userId) {
      throw new ForbiddenException('You can only update your own markmaps');
    }

    return this.prisma.markmap.update({
      where: { id },
      data: updateMarkmapDto,
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    if (markmap.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own markmaps');
    }

    return this.prisma.markmap.delete({
      where: { id },
    });
  }

  async search(searchDto: SearchMarkmapDto, userId?: string) {
    interface WhereCondition {
      isPublic?: boolean;
      language?: string;
      topic?: string;
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        text?: { contains: string; mode: 'insensitive' };
        authorId?: string;
        isPublic?: boolean;
        language?: string;
        topic?: string;
      }>;
    }

    const where: WhereCondition = { isPublic: true };

    if (searchDto.language) {
      where.language = searchDto.language;
    }

    if (searchDto.topic) {
      where.topic = searchDto.topic;
    }

    if (searchDto.query) {
      where.OR = [
        { title: { contains: searchDto.query, mode: 'insensitive' } },
        { text: { contains: searchDto.query, mode: 'insensitive' } },
      ];
    }

    // If user is logged in, also include their private markmaps
    if (userId) {
      where.OR = [{ ...where }, { authorId: userId }];
      delete where.isPublic;
    }

    return this.prisma.markmap.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInteraction(
    markmapId: string,
    createInteractionDto: CreateInteractionDto,
    userId?: string,
  ) {
    // Verify markmap exists
    const markmap = await this.prisma.markmap.findUnique({
      where: { id: markmapId },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    return this.prisma.interaction.create({
      data: {
        ...createInteractionDto,
        markmapId,
        userId,
      },
    });
  }

  async getUserHistory(userId: string) {
    const viewHistory = await this.prisma.viewHistory.findMany({
      where: { userId },
      include: {
        markmap: {
          include: {
            author: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: 50,
    });

    const interactions = await this.prisma.interaction.findMany({
      where: { userId },
      include: {
        markmap: {
          include: {
            author: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { interactedAt: 'desc' },
      take: 50,
    });

    return {
      viewHistory,
      interactions,
    };
  }
}

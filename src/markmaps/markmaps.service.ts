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
    const { tags, ...markmapData } = createMarkmapDto;

    return this.prisma.markmap.create({
      data: {
        ...markmapData,
        authorId: userId,
        tags: tags
          ? {
              create: await Promise.all(
                tags.map(async (tagName) => {
                  // Ensure tag starts with #
                  const normalizedName = tagName.startsWith('#')
                    ? tagName
                    : `#${tagName}`;

                  // Find or create tag
                  const tag = await this.prisma.tag.upsert({
                    where: { name: normalizedName },
                    update: {},
                    create: { name: normalizedName },
                  });

                  return {
                    tag: {
                      connect: { id: tag.id },
                    },
                  };
                }),
              ),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async findAll(userId?: string) {
    const where = userId
      ? {
          OR: [
            { isPublic: true, deletedAt: null },
            { authorId: userId, deletedAt: null },
          ],
        }
      : { isPublic: true, deletedAt: null };

    return this.prisma.markmap.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true },
        },
        tags: {
          include: {
            tag: true,
          },
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
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!markmap || markmap.deletedAt) {
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

    if (!markmap || markmap.deletedAt) {
      throw new NotFoundException('Markmap not found');
    }

    if (markmap.authorId !== userId) {
      throw new ForbiddenException('You can only update your own markmaps');
    }

    const { tags, ...markmapData } = updateMarkmapDto;

    // If tags are provided, update them
    if (tags !== undefined) {
      // Delete existing tag relationships
      await this.prisma.tagOnMarkmap.deleteMany({
        where: { markmapId: id },
      });

      // Create new tag relationships
      if (tags.length > 0) {
        await Promise.all(
          tags.map(async (tagName) => {
            // Ensure tag starts with #
            const normalizedName = tagName.startsWith('#')
              ? tagName
              : `#${tagName}`;

            // Find or create tag
            const tag = await this.prisma.tag.upsert({
              where: { name: normalizedName },
              update: {},
              create: { name: normalizedName },
            });

            // Create relationship
            await this.prisma.tagOnMarkmap.create({
              data: {
                tagId: tag.id,
                markmapId: id,
              },
            });
          }),
        );
      }
    }

    return this.prisma.markmap.update({
      where: { id },
      data: markmapData,
      include: {
        author: {
          select: { id: true, username: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id },
    });

    if (!markmap || markmap.deletedAt) {
      throw new NotFoundException('Markmap not found');
    }

    if (markmap.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own markmaps');
    }

    // Soft delete: set deletedAt timestamp
    return this.prisma.markmap.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async duplicate(id: string, userId: string) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id },
    });

    if (!markmap || markmap.deletedAt) {
      throw new NotFoundException('Markmap not found');
    }

    // Only allow duplicating if user owns it or it's public
    if (!markmap.isPublic && markmap.authorId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Create a duplicate

    const {
      id: _markmapId, // eslint-disable-line @typescript-eslint/no-unused-vars
      createdAt: _createdAt, // eslint-disable-line @typescript-eslint/no-unused-vars
      updatedAt: _updatedAt, // eslint-disable-line @typescript-eslint/no-unused-vars
      deletedAt: _deletedAt, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...markmapData
    } = markmap;
    return this.prisma.markmap.create({
      data: {
        ...markmapData,
        title: `${markmap.title} (Copy)`,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });
  }

  async restore(id: string, userId: string) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    if (!markmap.deletedAt) {
      throw new ForbiddenException('Markmap is not deleted');
    }

    if (markmap.authorId !== userId) {
      throw new ForbiddenException('You can only restore your own markmaps');
    }

    return this.prisma.markmap.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });
  }

  async search(searchDto: SearchMarkmapDto, userId?: string) {
    interface WhereCondition {
      deletedAt?: null;
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
        deletedAt?: null;
      }>;
    }

    const where: WhereCondition = { isPublic: true, deletedAt: null };

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
      where.OR = [{ ...where }, { authorId: userId, deletedAt: null }];
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

  async getTagSuggestions(query?: string) {
    const where = query
      ? {
          name: {
            contains: query.startsWith('#') ? query : `#${query}`,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const tags = await this.prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: { markmaps: true },
        },
      },
      orderBy: {
        markmaps: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return tags.map((tag) => ({
      name: tag.name,
      count: tag._count.markmaps,
    }));
  }

  async getTagStatistics(timeFilter: 'all' | '24h' | '1h' = 'all') {
    let dateFilter: Date | undefined;

    if (timeFilter === '24h') {
      dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (timeFilter === '1h') {
      dateFilter = new Date(Date.now() - 60 * 60 * 1000);
    }

    const tags = await this.prisma.tag.findMany({
      where: dateFilter
        ? {
            markmaps: {
              some: {
                createdAt: {
                  gte: dateFilter,
                },
              },
            },
          }
        : {},
      include: {
        _count: {
          select: { markmaps: true },
        },
        markmaps: dateFilter
          ? {
              where: {
                createdAt: {
                  gte: dateFilter,
                },
              },
            }
          : true,
      },
      orderBy: {
        markmaps: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return tags.map((tag) => ({
      name: tag.name,
      count: dateFilter ? tag.markmaps.length : tag._count.markmaps,
    }));
  }

  async getTagHistoricalTrend(tagName: string) {
    // Ensure tag starts with #
    const normalizedName = tagName.startsWith('#') ? tagName : `#${tagName}`;

    const tag = await this.prisma.tag.findUnique({
      where: { name: normalizedName },
      include: {
        markmaps: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!tag) {
      return [];
    }

    // Group by day for the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyCounts = new Map<string, number>();

    // Initialize all days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyCounts.set(dateKey, 0);
    }

    // Count markmaps per day
    tag.markmaps.forEach((markmap) => {
      const dateKey = markmap.createdAt.toISOString().split('T')[0];
      if (dailyCounts.has(dateKey)) {
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
      }
    });

    // Convert to array
    const trend = Array.from(dailyCounts.entries())
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return trend;
  }
}

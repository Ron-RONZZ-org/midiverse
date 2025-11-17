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

  /**
   * Generate a URL-friendly slug from title
   */
  private generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  /**
   * Generate a unique slug for a markmap
   * Adds a counter suffix if a slug already exists for the same author
   */
  private async generateUniqueSlug(
    title: string,
    authorId?: string,
  ): Promise<string> {
    const baseSlug = this.generateSlugFromTitle(title);

    // Check if slug exists for this author
    const existingSlugs = await this.prisma.markmap.findMany({
      where: {
        authorId,
        slug: {
          startsWith: baseSlug,
        },
        deletedAt: null,
      },
      select: { slug: true },
    });

    // If no existing slugs, use the base slug
    if (existingSlugs.length === 0) {
      return baseSlug;
    }

    // Find the highest counter
    let maxCounter = 0;
    const slugPattern = new RegExp(`^${baseSlug}(?:-(\\d+))?$`);

    existingSlugs.forEach(({ slug }) => {
      const match = slug.match(slugPattern);
      if (match) {
        const counter = match[1] ? parseInt(match[1], 10) : 0;
        maxCounter = Math.max(maxCounter, counter);
      }
    });

    // Return slug with next counter
    return maxCounter === 0 ? `${baseSlug}-1` : `${baseSlug}-${maxCounter + 1}`;
  }

  async create(createMarkmapDto: CreateMarkmapDto, userId?: string) {
    const { tags, ...markmapData } = createMarkmapDto;

    // Generate unique slug
    const slug = await this.generateUniqueSlug(markmapData.title, userId);

    return this.prisma.markmap.create({
      data: {
        ...markmapData,
        slug,
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

  async findByUsernameAndSlug(username: string, slug: string, userId?: string) {
    // First, find the user by username
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find the markmap by author and slug
    const markmap = await this.prisma.markmap.findFirst({
      where: {
        authorId: user.id,
        slug,
        deletedAt: null,
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
          markmapId: markmap.id,
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

    // If title is being updated, regenerate slug
    if (updateMarkmapDto.title && updateMarkmapDto.title !== markmap.title) {
      const newSlug = await this.generateUniqueSlug(
        updateMarkmapDto.title,
        userId,
      );
      markmapData['slug'] = newSlug;
    }

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
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' };
        text?: { contains: string; mode: 'insensitive' };
        authorId?: string;
        isPublic?: boolean;
        language?: string;
        deletedAt?: null;
      }>;
    }

    const where: WhereCondition = { isPublic: true, deletedAt: null };

    if (searchDto.language) {
      where.language = searchDto.language;
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
        tags: {
          include: {
            tag: true,
          },
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

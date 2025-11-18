import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

@Injectable()
export class SeriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a URL-friendly slug from series name
   */
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  /**
   * Generate a unique slug for a series
   */
  private async generateUniqueSlug(
    name: string,
    authorId: string,
  ): Promise<string> {
    const baseSlug = this.generateSlugFromName(name);

    const existingSlugs = await this.prisma.series.findMany({
      where: {
        authorId,
        slug: {
          startsWith: baseSlug,
        },
      },
      select: { slug: true },
    });

    if (existingSlugs.length === 0) {
      return baseSlug;
    }

    let maxCounter = 0;
    const slugPattern = new RegExp(`^${baseSlug}(?:-(\\d+))?$`);

    existingSlugs.forEach(({ slug }) => {
      const match = slug.match(slugPattern);
      if (match) {
        const counter = match[1] ? parseInt(match[1], 10) : 0;
        maxCounter = Math.max(maxCounter, counter);
      }
    });

    return maxCounter === 0 ? `${baseSlug}-1` : `${baseSlug}-${maxCounter + 1}`;
  }

  async create(createSeriesDto: CreateSeriesDto, userId: string) {
    const slug = await this.generateUniqueSlug(createSeriesDto.name, userId);

    return this.prisma.series.create({
      data: {
        ...createSeriesDto,
        slug,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            markmaps: true,
          },
        },
      },
    });
  }

  async findAll(userId?: string) {
    const where = userId
      ? {
          OR: [{ isPublic: true }, { authorId: userId }],
        }
      : { isPublic: true };

    return this.prisma.series.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            markmaps: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUsername(username: string, requestingUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where =
      requestingUserId === user.id
        ? { authorId: user.id }
        : { authorId: user.id, isPublic: true };

    return this.prisma.series.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            markmaps: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const series = await this.prisma.series.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        markmaps: {
          where: {
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    // Check access permissions
    if (!series.isPublic && series.authorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this series',
      );
    }

    return series;
  }

  async findBySlug(username: string, slug: string, userId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const series = await this.prisma.series.findUnique({
      where: {
        authorId_slug: {
          authorId: user.id,
          slug,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        markmaps: {
          where: {
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    // Check access permissions
    if (!series.isPublic && series.authorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this series',
      );
    }

    return series;
  }

  async update(id: string, updateSeriesDto: UpdateSeriesDto, userId: string) {
    const series = await this.prisma.series.findUnique({
      where: { id },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    if (series.authorId !== userId) {
      throw new ForbiddenException('You can only update your own series');
    }

    const updateData: any = { ...updateSeriesDto };

    // If name is being updated, generate new slug
    if (updateSeriesDto.name) {
      updateData.slug = await this.generateUniqueSlug(
        updateSeriesDto.name,
        userId,
      );
    }

    return this.prisma.series.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: {
            markmaps: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const series = await this.prisma.series.findUnique({
      where: { id },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    if (series.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own series');
    }

    // Remove series reference from all markmaps in this series
    await this.prisma.markmap.updateMany({
      where: { seriesId: id },
      data: { seriesId: null },
    });

    return this.prisma.series.delete({
      where: { id },
    });
  }
}

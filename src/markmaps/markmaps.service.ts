import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeynodesService } from '../keynodes/keynodes.service';
import { CreateMarkmapDto } from './dto/create-markmap.dto';
import { UpdateMarkmapDto } from './dto/update-markmap.dto';
import { SearchMarkmapDto } from './dto/search-markmap.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';

// Relevance scoring constants for search
const EXACT_TITLE_MATCH_SCORE = 1000;
const PARTIAL_TITLE_MATCH_SCORE = 100;
const TEXT_MATCH_SCORE = 10;
const VIEW_COUNT_MULTIPLIER = 0.1;

@Injectable()
export class MarkmapsService {
  constructor(
    private prisma: PrismaService,
    private keynodesService: KeynodesService,
  ) {}

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
    const { tags, keynodes, ...markmapData } = createMarkmapDto;

    // Generate unique slug
    const slug = await this.generateUniqueSlug(markmapData.title, userId);

    const markmap = await this.prisma.markmap.create({
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
        keynodes: keynodes
          ? {
              create: await Promise.all(
                keynodes.map(async (keynode) => {
                  // Find keynode by name
                  const keynodeEntity =
                    await this.keynodesService.findByName(keynode);

                  if (keynodeEntity) {
                    // Increment child node count
                    await this.keynodesService.updateChildNodeCount(
                      keynodeEntity.id,
                      1,
                    );

                    return {
                      keynode: {
                        connect: { id: keynodeEntity.id },
                      },
                    };
                  }

                  // If keynode doesn't exist, skip it (should be created via editor first)
                  return null;
                }),
              ).then((results) => results.filter((r) => r !== null)),
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
        keynodes: {
          include: {
            keynode: true,
          },
        },
      },
    });

    return markmap;
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

  async findByUsernameSeriesAndSlug(
    username: string,
    seriesSlug: string,
    markmapSlug: string,
    userId?: string,
  ) {
    // First, find the user by username
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find the series by author and slug
    const series = await this.prisma.series.findUnique({
      where: {
        authorId_slug: {
          authorId: user.id,
          slug: seriesSlug,
        },
      },
      select: { id: true, isPublic: true },
    });

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    // Check series access
    if (!series.isPublic && (!userId || userId !== user.id)) {
      throw new ForbiddenException('Access denied to this series');
    }

    // Find the markmap by author, series, and slug
    const markmap = await this.prisma.markmap.findFirst({
      where: {
        authorId: user.id,
        seriesId: series.id,
        slug: markmapSlug,
        deletedAt: null,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
        series: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found in this series');
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
      include: {
        keynodes: {
          include: {
            keynode: true,
          },
        },
      },
    });

    if (!markmap || markmap.deletedAt) {
      throw new NotFoundException('Markmap not found');
    }

    if (markmap.authorId !== userId) {
      throw new ForbiddenException('You can only update your own markmaps');
    }

    const { tags, keynodes, ...markmapData } = updateMarkmapDto;

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

    // If keynodes are provided, update them
    if (keynodes !== undefined) {
      // Get old keynodes to decrement their counts
      const oldKeynodes = markmap.keynodes;

      // Decrement count for old keynodes
      await Promise.all(
        oldKeynodes.map(async (k) => {
          await this.keynodesService.updateChildNodeCount(k.keynode.id, -1);
        }),
      );

      // Delete existing keynode relationships
      await this.prisma.keynodeOnMarkmap.deleteMany({
        where: { markmapId: id },
      });

      // Create new keynode relationships
      if (keynodes.length > 0) {
        await Promise.all(
          keynodes.map(async (keynode) => {
            const keynodeEntity =
              await this.keynodesService.findByName(keynode);

            if (keynodeEntity) {
              // Increment child node count
              await this.keynodesService.updateChildNodeCount(
                keynodeEntity.id,
                1,
              );

              // Create relationship
              await this.prisma.keynodeOnMarkmap.create({
                data: {
                  keynodeId: keynodeEntity.id,
                  markmapId: id,
                },
              });
            }
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
        keynodes: {
          include: {
            keynode: true,
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

    // Create a duplicate with a new title and slug
    const newTitle = `${markmap.title} (Copy)`;
    const newSlug = await this.generateUniqueSlug(newTitle, userId);

    const {
      id: _markmapId, // eslint-disable-line @typescript-eslint/no-unused-vars
      createdAt: _createdAt, // eslint-disable-line @typescript-eslint/no-unused-vars
      updatedAt: _updatedAt, // eslint-disable-line @typescript-eslint/no-unused-vars
      deletedAt: _deletedAt, // eslint-disable-line @typescript-eslint/no-unused-vars
      slug: _slug, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...markmapData
    } = markmap;
    return this.prisma.markmap.create({
      data: {
        ...markmapData,
        title: newTitle,
        slug: newSlug,
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

  async generateDownloadHtml(id: string, userId?: string): Promise<string> {
    const markmap = await this.findOne(id, userId);

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    // Helper function to escape HTML entities
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Get tags as comma-separated string and escape
    const tags = escapeHtml(
      markmap.tags?.map((t: any) => t.tag.name).join(', ') || '',
    );
    const title = escapeHtml(markmap.title);
    const username = escapeHtml(markmap.author?.username || 'Anonymous');
    const language = escapeHtml(markmap.language || 'en');

    // Build markmap frontmatter
    const markmapConfig = `---
markmap:
    maxWidth: ${markmap.maxWidth}
    colorFreezeLevel: ${markmap.colorFreezeLevel}
    initialExpandLevel: ${markmap.initialExpandLevel}
---
${markmap.text}`;

    const html = `<!DOCTYPE html>
<html lang="${language}">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="author" content="${username}">
    <meta name="tag" content="${tags}">
    <title>${title}</title>
    <style>
      svg.markmap {
        width: 100%;
        height: 100vh;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/markmap-autoloader@0.18"></script>
  </head>
  <body>
    <div class="markmap">
      <script type="text/template">
${markmapConfig}
      </script>
    </div>
  </body>
</html>`;

    return html;
  }

  async parseImportedFile(
    filename: string,
    content: string,
  ): Promise<Partial<CreateMarkmapDto>> {
    const isHtml =
      filename.toLowerCase().endsWith('.html') ||
      filename.toLowerCase().endsWith('.htm');

    if (isHtml) {
      return this.parseHtmlImport(content);
    } else {
      return this.parseMarkdownImport(content);
    }
  }

  private parseHtmlImport(html: string): Partial<CreateMarkmapDto> {
    const result: Partial<CreateMarkmapDto> = {
      title: '',
      text: '',
      language: 'en',
      maxWidth: 0,
      colorFreezeLevel: 0,
      initialExpandLevel: -1,
      tags: [],
      isPublic: true,
    };

    // Extract language from <html lang="...">
    const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    if (langMatch) {
      result.language = langMatch[1];
    }

    // Extract title from <title>...</title>
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      result.title = titleMatch[1];
    }

    // Extract tags from <meta name="tag" content="...">
    const tagsMatch = html.match(
      /<meta[^>]*name=["']tag["'][^>]*content=["']([^"']+)["']/i,
    );
    if (tagsMatch) {
      result.tags = tagsMatch[1]
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    // Extract markmap content from <script type="text/template">
    const scriptMatch = html.match(
      /<script[^>]*type=["']text\/template["'][^>]*>([\s\S]*?)<\/script>/i,
    );
    if (scriptMatch) {
      const markmapContent = scriptMatch[1].trim();

      // Parse frontmatter if present
      const frontmatterMatch = markmapContent.match(
        /^---\s*\nmarkmap:\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
      );
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const content = frontmatterMatch[2];

        // Parse markmap parameters
        const maxWidthMatch = frontmatter.match(/maxWidth:\s*(\d+)/);
        if (maxWidthMatch) {
          result.maxWidth = parseInt(maxWidthMatch[1], 10);
        }

        const colorFreezeLevelMatch = frontmatter.match(
          /colorFreezeLevel:\s*(\d+)/,
        );
        if (colorFreezeLevelMatch) {
          result.colorFreezeLevel = parseInt(colorFreezeLevelMatch[1], 10);
        }

        const initialExpandLevelMatch = frontmatter.match(
          /initialExpandLevel:\s*(-?\d+)/,
        );
        if (initialExpandLevelMatch) {
          result.initialExpandLevel = parseInt(initialExpandLevelMatch[1], 10);
        }

        result.text = content.trim();
      } else {
        result.text = markmapContent;
      }
    }

    // Fallback: use filename as title if no title found
    if (!result.title) {
      result.title = 'Imported Markmap';
    }

    return result;
  }

  private parseMarkdownImport(content: string): Partial<CreateMarkmapDto> {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim() || 'Imported Markmap';

    // Remove markdown header syntax from first line if present
    const title = firstLine.replace(/^#+\s*/, '');

    return {
      title,
      text: content,
      language: 'en',
      maxWidth: 0,
      colorFreezeLevel: 0,
      initialExpandLevel: -1,
      tags: [],
      isPublic: true,
    };
  }

  async search(searchDto: SearchMarkmapDto, userId?: string) {
    interface WhereCondition {
      deletedAt?: null;
      isPublic?: boolean;
      language?: string;
      authorId?: string;
      tags?: {
        some: {
          tag: {
            name: {
              in: string[];
            };
          };
        };
      };
      keynodes?: {
        some: {
          keynode: {
            name: string;
          };
        };
      };
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

    // Filter by author username
    if (searchDto.author) {
      const author = await this.prisma.user.findUnique({
        where: { username: searchDto.author },
        select: { id: true },
      });
      if (author) {
        where.authorId = author.id;
      }
    }

    // Filter by tags
    if (searchDto.tags && searchDto.tags.length > 0) {
      const normalizedTags = searchDto.tags.map((tag) =>
        tag.startsWith('#') ? tag : `#${tag}`,
      );
      where.tags = {
        some: {
          tag: {
            name: {
              in: normalizedTags,
            },
          },
        },
      };
    }

    // Filter by keynode
    if (searchDto.keynode) {
      where.keynodes = {
        some: {
          keynode: {
            name: searchDto.keynode,
          },
        },
      };
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

    // Determine ordering based on sortBy parameter
    let orderBy: any = { createdAt: 'desc' }; // default: newest first

    switch (searchDto.sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'views':
        // For views, we'll need to use a raw query or count separately
        // Using viewHistory count for now
        orderBy = undefined; // Will sort manually after fetching
        break;
      case 'relevant':
        // For relevance, we'll sort manually after fetching based on match quality
        orderBy = undefined;
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const markmaps = await this.prisma.markmap.findMany({
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
        keynodes: {
          include: {
            keynode: {
              select: {
                id: true,
                name: true,
                category: true,
                childNodeCount: true,
              },
            },
          },
        },
        _count: {
          select: {
            viewHistory: true,
          },
        },
      },
      orderBy: orderBy || { createdAt: 'desc' },
    });

    // Apply custom sorting if needed
    if (searchDto.sortBy === 'views') {
      markmaps.sort((a, b) => b._count.viewHistory - a._count.viewHistory);
    } else if (searchDto.keynode) {
      // When keynode filter is specified, rank by child node count
      markmaps.sort((a, b) => {
        // Find the matching keynode in each markmap
        const keynodeA = a.keynodes?.find(
          (k) => k.keynode.name === searchDto.keynode,
        );
        const keynodeB = b.keynodes?.find(
          (k) => k.keynode.name === searchDto.keynode,
        );

        const countA = keynodeA?.keynode.childNodeCount || 0;
        const countB = keynodeB?.keynode.childNodeCount || 0;

        return countB - countA;
      });
    } else if (searchDto.sortBy === 'relevant' && searchDto.query) {
      // Calculate relevance score based on:
      // 1. Exact match in title (highest priority)
      // 2. Partial match in title
      // 3. Match in text
      // 4. View count
      const query = searchDto.query.toLowerCase();
      markmaps.sort((a, b) => {
        let scoreA = a._count.viewHistory * VIEW_COUNT_MULTIPLIER;
        let scoreB = b._count.viewHistory * VIEW_COUNT_MULTIPLIER;

        // Title exact match
        if (a.title.toLowerCase() === query) scoreA += EXACT_TITLE_MATCH_SCORE;
        if (b.title.toLowerCase() === query) scoreB += EXACT_TITLE_MATCH_SCORE;

        // Title contains match
        if (a.title.toLowerCase().includes(query))
          scoreA += PARTIAL_TITLE_MATCH_SCORE;
        if (b.title.toLowerCase().includes(query))
          scoreB += PARTIAL_TITLE_MATCH_SCORE;

        // Text contains match
        if (a.text.toLowerCase().includes(query)) scoreA += TEXT_MATCH_SCORE;
        if (b.text.toLowerCase().includes(query)) scoreB += TEXT_MATCH_SCORE;

        return scoreB - scoreA;
      });
    }

    return markmaps;
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

  async getLanguageSuggestions(query?: string) {
    // Common language codes with their full names
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ru', name: 'Русский' },
      { code: 'ja', name: '日本語' },
      { code: 'zh', name: '中文' },
      { code: 'ko', name: '한국어' },
      { code: 'ar', name: 'العربية' },
      { code: 'hi', name: 'हिन्दी' },
      { code: 'nl', name: 'Nederlands' },
      { code: 'pl', name: 'Polski' },
      { code: 'tr', name: 'Türkçe' },
      { code: 'sv', name: 'Svenska' },
      { code: 'da', name: 'Dansk' },
      { code: 'fi', name: 'Suomi' },
      { code: 'no', name: 'Norsk' },
      { code: 'cs', name: 'Čeština' },
    ];

    if (!query) {
      return languages;
    }

    // Filter by query
    const lowerQuery = query.toLowerCase();
    return languages.filter(
      (lang) =>
        lang.code.toLowerCase().includes(lowerQuery) ||
        lang.name.toLowerCase().includes(lowerQuery),
    );
  }

  async getAuthorSuggestions(query?: string) {
    const where = query
      ? {
          username: {
            contains: query,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      select: {
        username: true,
        displayName: true,
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

    return users.map((user) => ({
      username: user.username,
      displayName: user.displayName,
      markmapCount: user._count.markmaps,
    }));
  }
}

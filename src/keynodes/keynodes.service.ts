import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKeynodeDto } from './dto/create-keynode.dto';

@Injectable()
export class KeynodesService {
  constructor(private prisma: PrismaService) {}

  async create(createKeynodeDto: CreateKeynodeDto) {
    return this.prisma.keynode.create({
      data: createKeynodeDto,
      include: {
        parent: {
          select: { id: true, name: true, category: true },
        },
        children: {
          select: { id: true, name: true, category: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const keynode = await this.prisma.keynode.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, category: true },
        },
        children: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    if (!keynode) {
      throw new NotFoundException('Keynode not found');
    }

    return keynode;
  }

  async getSuggestions(query?: string) {
    const where = query
      ? {
          name: {
            contains: query,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const keynodes = await this.prisma.keynode.findMany({
      where,
      orderBy: [{ childNodeCount: 'desc' }, { name: 'asc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        category: true,
        childNodeCount: true,
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    return keynodes;
  }

  async updateChildNodeCount(keynodeId: string, increment: number) {
    return this.prisma.keynode.update({
      where: { id: keynodeId },
      data: {
        childNodeCount: {
          increment,
        },
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.keynode.findUnique({
      where: { name },
      include: {
        parent: {
          select: { id: true, name: true, category: true },
        },
        children: {
          select: { id: true, name: true, category: true },
        },
      },
    });
  }

  /**
   * Get the full keynode hierarchy as markdown for visualization in a markmap.
   * Optionally includes the sum of reference counts (node + all children).
   */
  async getHierarchy(showReferenceCounts: boolean = false): Promise<string> {
    // Get all keynodes with their reference counts
    const keynodes = await this.prisma.keynode.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        parentId: true,
        _count: {
          select: {
            markmaps: true,
          },
        },
      },
    });

    // Build a map for quick lookup
    const keynodeMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        parentId: string | null;
        referenceCount: number;
        children: string[];
      }
    >();

    // Initialize map with reference counts
    for (const keynode of keynodes) {
      keynodeMap.set(keynode.id, {
        id: keynode.id,
        name: keynode.name,
        category: keynode.category,
        parentId: keynode.parentId,
        referenceCount: keynode._count.markmaps,
        children: [],
      });
    }

    // Build parent-child relationships
    for (const keynode of keynodes) {
      if (keynode.parentId && keynodeMap.has(keynode.parentId)) {
        keynodeMap.get(keynode.parentId)!.children.push(keynode.id);
      }
    }

    // Find root nodes (nodes without parents)
    const rootNodes = Array.from(keynodeMap.values()).filter(
      (node) => !node.parentId,
    );

    // Memoized calculation of total reference counts (node + all descendants)
    const totalRefsCache = new Map<string, number>();
    const calculateTotalRefs = (nodeId: string): number => {
      if (totalRefsCache.has(nodeId)) {
        return totalRefsCache.get(nodeId)!;
      }

      const node = keynodeMap.get(nodeId);
      if (!node) return 0;

      let total = node.referenceCount;
      for (const childId of node.children) {
        total += calculateTotalRefs(childId);
      }

      totalRefsCache.set(nodeId, total);
      return total;
    };

    // Generate markdown hierarchy
    const generateMarkdown = (nodeId: string, depth: number): string => {
      const node = keynodeMap.get(nodeId);
      if (!node) return '';

      const indent = '#'.repeat(Math.min(depth + 1, 6));
      let label = node.name;

      if (showReferenceCounts) {
        const totalRefs = calculateTotalRefs(nodeId);
        if (totalRefs > 0) {
          label = `${node.name} (${totalRefs})`;
        }
      }

      let markdown = `${indent} ${label}\n`;

      // Sort children alphabetically
      const sortedChildren = [...node.children].sort((a, b) => {
        const nodeA = keynodeMap.get(a);
        const nodeB = keynodeMap.get(b);
        return (nodeA?.name || '').localeCompare(nodeB?.name || '');
      });

      for (const childId of sortedChildren) {
        markdown += generateMarkdown(childId, depth + 1);
      }

      return markdown;
    };

    // Generate the full markdown document
    let markdown = '# Keynodes\n';

    // Group root nodes by category
    const categories = new Map<string, typeof rootNodes>();
    for (const node of rootNodes) {
      if (!categories.has(node.category)) {
        categories.set(node.category, []);
      }
      categories.get(node.category)!.push(node);
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categories.keys()).sort();

    for (const category of sortedCategories) {
      const categoryNodes = categories.get(category)!;
      const formattedCategory = category.replace(/_/g, ' ');

      // Calculate total refs for category if showing counts
      if (showReferenceCounts) {
        let categoryTotal = 0;
        for (const node of categoryNodes) {
          categoryTotal += calculateTotalRefs(node.id);
        }
        if (categoryTotal > 0) {
          markdown += `## ${formattedCategory} (${categoryTotal})\n`;
        } else {
          markdown += `## ${formattedCategory}\n`;
        }
      } else {
        markdown += `## ${formattedCategory}\n`;
      }

      // Sort nodes within category alphabetically
      categoryNodes.sort((a, b) => a.name.localeCompare(b.name));

      for (const node of categoryNodes) {
        markdown += generateMarkdown(node.id, 2);
      }
    }

    return markdown;
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.keynode.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => c.category);
  }
}

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
}

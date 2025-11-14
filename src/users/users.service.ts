import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarkmapsService } from '../markmaps/markmaps.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private markmapsService: MarkmapsService,
  ) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        _count: {
          select: {
            markmaps: true,
            viewHistory: true,
            interactions: true,
          },
        },
      },
    });
  }

  async getUserMarkmaps(userId: string) {
    return this.prisma.markmap.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserHistory(userId: string) {
    return this.markmapsService.getUserHistory(userId);
  }
}

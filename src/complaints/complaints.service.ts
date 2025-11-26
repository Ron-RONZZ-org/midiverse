import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import {
  ResolveComplaintDto,
  ComplaintResolutionAction,
} from './dto/resolve-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a new complaint for a markmap
   */
  async create(
    markmapId: string,
    createComplaintDto: CreateComplaintDto,
    reporterId?: string,
  ) {
    // Verify markmap exists
    const markmap = await this.prisma.markmap.findUnique({
      where: { id: markmapId },
    });

    if (!markmap || markmap.deletedAt) {
      throw new NotFoundException('Markmap not found');
    }

    // Create the complaint
    return this.prisma.complaint.create({
      data: {
        reason: createComplaintDto.reason,
        explanation: createComplaintDto.explanation,
        markmapId,
        reporterId,
      },
      include: {
        markmap: {
          select: { id: true, title: true },
        },
      },
    });
  }

  /**
   * Get all pending complaints (for content managers/admins)
   */
  async findPending() {
    return this.prisma.complaint.findMany({
      where: { status: 'pending' },
      include: {
        markmap: {
          select: {
            id: true,
            title: true,
            author: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        reporter: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get appealed complaints (for administrators only)
   */
  async findAppealed() {
    return this.prisma.complaint.findMany({
      where: { status: 'appealed' },
      include: {
        markmap: {
          select: {
            id: true,
            title: true,
            author: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        reporter: {
          select: { id: true, username: true },
        },
        resolvedBy: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a specific complaint
   */
  async findOne(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        markmap: {
          select: {
            id: true,
            title: true,
            text: true,
            author: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        reporter: {
          select: { id: true, username: true },
        },
        resolvedBy: {
          select: { id: true, username: true },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  /**
   * Resolve a complaint (sustain or dismiss)
   */
  async resolve(
    id: string,
    resolveDto: ResolveComplaintDto,
    resolvedById: string,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        markmap: {
          select: {
            id: true,
            title: true,
            author: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        reporter: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (complaint.status !== 'pending' && complaint.status !== 'appealed') {
      throw new BadRequestException('Complaint has already been resolved');
    }

    const newStatus =
      resolveDto.action === ComplaintResolutionAction.SUSTAIN
        ? 'sustained'
        : 'dismissed';

    // Update complaint status
    const updatedComplaint = await this.prisma.complaint.update({
      where: { id },
      data: {
        status: newStatus,
        resolution: resolveDto.resolution,
        resolvedAt: new Date(),
        resolvedById,
      },
    });

    // If sustained, retire the markmap from public view
    if (resolveDto.action === ComplaintResolutionAction.SUSTAIN) {
      await this.prisma.markmap.update({
        where: { id: complaint.markmapId },
        data: { isRetired: true },
      });

      // Notify the markmap author
      if (complaint.markmap.author?.email) {
        try {
          await this.emailService.sendEmail(
            complaint.markmap.author.email,
            'Your markmap has been retired',
            `Your markmap "${complaint.markmap.title}" has been retired from public view due to a sustained complaint.\n\nReason: ${complaint.reason}\nResolution: ${resolveDto.resolution || 'No additional details provided.'}`,
          );
        } catch (error) {
          console.error('Failed to send notification email:', error);
        }
      }
    } else {
      // Notify the complainer that their complaint was dismissed
      if (complaint.reporter?.email) {
        try {
          await this.emailService.sendEmail(
            complaint.reporter.email,
            'Your complaint has been dismissed',
            `Your complaint about "${complaint.markmap.title}" has been reviewed and dismissed.\n\nResolution: ${resolveDto.resolution || 'No additional details provided.'}\n\nIf you believe this decision is incorrect, you can appeal to an administrator.`,
          );
        } catch (error) {
          console.error('Failed to send notification email:', error);
        }
      }
    }

    return updatedComplaint;
  }

  /**
   * Appeal a dismissed complaint (escalate to admin)
   */
  async appeal(id: string, reporterId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    if (complaint.status !== 'dismissed') {
      throw new BadRequestException('Only dismissed complaints can be appealed');
    }

    if (complaint.reporterId !== reporterId) {
      throw new BadRequestException('You can only appeal your own complaints');
    }

    return this.prisma.complaint.update({
      where: { id },
      data: {
        status: 'appealed',
        resolvedAt: null,
        resolvedById: null,
      },
    });
  }
}

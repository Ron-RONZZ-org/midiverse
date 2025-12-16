import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Check if a user has complaints email notifications enabled
   */
  private async hasComplaintsEmailEnabled(userId: string): Promise<boolean> {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: { emailComplaintsNotifications: true },
    });
    // Default to true if no preferences exist
    return preferences?.emailComplaintsNotifications ?? true;
  }

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
   * Get appealed and escalated complaints (for administrators only)
   */
  async findAppealed() {
    return this.prisma.complaint.findMany({
      where: {
        status: { in: ['appealed', 'escalated'] },
      },
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
   * Get markmaps pending review (edited after retirement)
   */
  async findPendingReview() {
    return this.prisma.markmap.findMany({
      where: { reviewStatus: 'pending_review' },
      include: {
        author: {
          select: { id: true, username: true, email: true },
        },
        complaints: {
          where: { status: 'sustained' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            reason: true,
            explanation: true,
            resolution: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
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
   * Format complaint reason for display
   */
  private formatComplaintReason(reason: string): string {
    const labels: Record<string, string> = {
      harassment: 'Harassment',
      false_information: 'False Information',
      author_right_infringement: 'Copyright Infringement',
      inciting_violence_hate: 'Inciting Violence/Hate',
      discriminatory_abusive: 'Discriminatory/Abusive Content',
    };
    return labels[reason] || reason;
  }

  /**
   * Resolve a complaint (sustain, dismiss, or escalate)
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

    if (
      complaint.status !== 'pending' &&
      complaint.status !== 'appealed' &&
      complaint.status !== 'escalated'
    ) {
      throw new BadRequestException('Complaint has already been resolved');
    }

    // Handle escalation differently - only pending complaints can be escalated
    if (resolveDto.action === ComplaintResolutionAction.ESCALATE) {
      if (complaint.status !== 'pending') {
        throw new BadRequestException(
          'Only pending complaints can be escalated',
        );
      }
      const updatedComplaint = await this.prisma.complaint.update({
        where: { id },
        data: {
          status: 'escalated',
          resolution: resolveDto.resolution,
        },
      });
      return updatedComplaint;
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

    // If sustained, retire the markmap from public view and set review status
    if (resolveDto.action === ComplaintResolutionAction.SUSTAIN) {
      await this.prisma.markmap.update({
        where: { id: complaint.markmapId },
        data: {
          isRetired: true,
          reviewStatus: 'action_required',
        },
      });

      // Create in-app notification for the markmap author
      if (complaint.markmap.author?.id) {
        await this.notificationsService.create(
          complaint.markmap.author.id,
          'complaint_sustained',
          'Markmap Retired - Action Required',
          `Your markmap "${complaint.markmap.title}" has been retired from public view due to a sustained complaint.\n\nReason: ${this.formatComplaintReason(complaint.reason)}\nResolution: ${resolveDto.resolution || 'No additional details provided.'}\n\nPlease edit your markmap to address the issue and resubmit for review.`,
          {
            markmapId: complaint.markmapId,
            complaintId: id,
          },
        );
      }

      // Notify the markmap author via email (only if they have complaints notifications enabled)
      if (complaint.markmap.author?.id && complaint.markmap.author?.email) {
        const hasEmailEnabled = await this.hasComplaintsEmailEnabled(
          complaint.markmap.author.id,
        );
        if (hasEmailEnabled) {
          try {
            await this.emailService.sendEmail(
              complaint.markmap.author.email,
              'Your markmap has been retired - Action Required',
              `Your markmap "${complaint.markmap.title}" has been retired from public view due to a sustained complaint.\n\nReason: ${this.formatComplaintReason(complaint.reason)}\nResolution: ${resolveDto.resolution || 'No additional details provided.'}\n\nPlease log in to edit your markmap and address the issue, then resubmit for review.`,
              complaint.markmap.author.id,
            );
          } catch (error) {
            console.error('Failed to send notification email:', error);
          }
        }
      }
    } else {
      // Create in-app notification for the complaint reporter
      if (complaint.reporter?.id) {
        await this.notificationsService.create(
          complaint.reporter.id,
          'complaint_dismissed',
          'Complaint Dismissed',
          `Your complaint about "${complaint.markmap.title}" has been reviewed and dismissed.\n\nResolution: ${resolveDto.resolution || 'No additional details provided.'}\n\nIf you believe this decision is incorrect, you can appeal to an administrator.`,
          {
            markmapId: complaint.markmapId,
            complaintId: id,
          },
        );
      }

      // Notify the complainer via email that their complaint was dismissed (only if they have complaints notifications enabled)
      if (complaint.reporter?.id && complaint.reporter?.email) {
        const hasEmailEnabled = await this.hasComplaintsEmailEnabled(
          complaint.reporter.id,
        );
        if (hasEmailEnabled) {
          try {
            await this.emailService.sendEmail(
              complaint.reporter.email,
              'Your complaint has been dismissed',
              `Your complaint about "${complaint.markmap.title}" has been reviewed and dismissed.\n\nResolution: ${resolveDto.resolution || 'No additional details provided.'}\n\nIf you believe this decision is incorrect, you can appeal to an administrator.`,
              complaint.reporter.id,
            );
          } catch (error) {
            console.error('Failed to send notification email:', error);
          }
        }
      }
    }

    return updatedComplaint;
  }

  /**
   * Review an edited markmap (reinstate or send back for further edits)
   */
  async reviewMarkmap(
    markmapId: string,
    action: 'reinstate' | 'needs_edit',
    resolution: string,
    _resolvedById: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    const markmap = await this.prisma.markmap.findUnique({
      where: { id: markmapId },
      include: {
        author: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!markmap) {
      throw new NotFoundException('Markmap not found');
    }

    if (markmap.reviewStatus !== 'pending_review') {
      throw new BadRequestException('Markmap is not pending review');
    }

    if (action === 'reinstate') {
      // Reinstate the markmap
      await this.prisma.markmap.update({
        where: { id: markmapId },
        data: {
          isRetired: false,
          reviewStatus: 'none',
        },
      });

      // Create notification for the author
      if (markmap.author?.id) {
        await this.notificationsService.create(
          markmap.author.id,
          'markmap_reinstated',
          'Markmap Reinstated',
          `Your markmap "${markmap.title}" has been reviewed and reinstated to public view.\n\nNotes: ${resolution || 'No additional notes.'}`,
          { markmapId },
        );
      }

      // Send email notification (only if they have complaints notifications enabled)
      if (markmap.author?.id && markmap.author?.email) {
        const hasEmailEnabled = await this.hasComplaintsEmailEnabled(
          markmap.author.id,
        );
        if (hasEmailEnabled) {
          try {
            await this.emailService.sendEmail(
              markmap.author.email,
              'Your markmap has been reinstated',
              `Your markmap "${markmap.title}" has been reviewed and reinstated to public view.\n\nNotes: ${resolution || 'No additional notes.'}`,
              markmap.author.id,
            );
          } catch (error) {
            console.error('Failed to send notification email:', error);
          }
        }
      }

      return { success: true, action: 'reinstated' };
    } else {
      // Send back for further edits
      await this.prisma.markmap.update({
        where: { id: markmapId },
        data: {
          reviewStatus: 'action_required',
        },
      });

      // Create notification for the author
      if (markmap.author?.id) {
        await this.notificationsService.create(
          markmap.author.id,
          'markmap_needs_edit',
          'Markmap Needs Further Edits',
          `Your markmap "${markmap.title}" has been reviewed and requires further edits before it can be reinstated.\n\nFeedback: ${resolution || 'Please review and update your content.'}`,
          { markmapId },
        );
      }

      // Send email notification (only if they have complaints notifications enabled)
      if (markmap.author?.id && markmap.author?.email) {
        const hasEmailEnabled = await this.hasComplaintsEmailEnabled(
          markmap.author.id,
        );
        if (hasEmailEnabled) {
          try {
            await this.emailService.sendEmail(
              markmap.author.email,
              'Your markmap needs further edits',
              `Your markmap "${markmap.title}" has been reviewed and requires further edits before it can be reinstated.\n\nFeedback: ${resolution || 'Please review and update your content.'}`,
              markmap.author.id,
            );
          } catch (error) {
            console.error('Failed to send notification email:', error);
          }
        }
      }

      return { success: true, action: 'needs_edit' };
    }
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
      throw new BadRequestException(
        'Only dismissed complaints can be appealed',
      );
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

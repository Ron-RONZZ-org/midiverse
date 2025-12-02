import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { TurnstileService } from '../turnstile/turnstile.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CheckUsernameDto } from './dto/check-username.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private turnstileService: TurnstileService,
  ) {}

  /**
   * Check if a user's suspension has expired and auto-reinstate them
   */
  private async checkAndUpdateSuspension(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, suspendedUntil: true },
    });

    if (
      user?.status === 'suspended' &&
      user.suspendedUntil &&
      user.suspendedUntil <= new Date()
    ) {
      // Suspension has expired, reinstate the user
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'active',
          suspendedUntil: null,
        },
      });
      return 'active';
    }

    return user?.status;
  }

  async signUp(signUpDto: SignUpDto) {
    // Verify Turnstile token if provided
    if (signUpDto.turnstileToken) {
      await this.turnstileService.verifyToken(signUpDto.turnstileToken);
    }

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: signUpDto.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        'Email already registered. Please login instead.',
      );
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: signUpDto.username },
    });
    if (existingUsername) {
      throw new ConflictException(
        'Username already taken. Please choose a different username.',
      );
    }

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

    const user = await this.prisma.user.create({
      data: {
        email: signUpDto.email,
        username: signUpDto.username,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
        emailVerified: false,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.username,
        verificationToken,
      );
    } catch (error) {
      // Log error but don't fail signup
      this.logger.error('Failed to send verification email', error);
    }

    // Don't issue JWT token until email is verified
    return {
      message:
        'Account created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
      },
    };
  }

  async login(loginDto: LoginDto) {
    // Verify Turnstile token if provided
    if (loginDto.turnstileToken) {
      await this.turnstileService.verifyToken(loginDto.turnstileToken);
    }

    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Return a specific error with email for resend verification
      const error = new UnauthorizedException({
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
      throw error;
    }

    // Check and update suspension status if expired
    const currentStatus = await this.checkAndUpdateSuspension(user.id);

    // Check if user is suspended
    if (currentStatus === 'suspended') {
      const suspendedUntilMsg = user.suspendedUntil
        ? ` until ${user.suspendedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        : '';
      throw new ForbiddenException(
        `Your account is suspended${suspendedUntilMsg}. You cannot publish or edit content.`,
      );
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        role: user.role,
        status: currentStatus,
      },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: verifyEmailDto.token,
        emailVerificationTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    // Issue JWT token after verification
    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Email verified successfully',
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: true,
        role: user.role,
        status: user.status,
      },
    };
  }

  async resendVerificationEmail(resendDto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: resendDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: tokenExpiry,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.username,
      verificationToken,
    );

    return {
      message: 'Verification email sent successfully',
    };
  }

  async validateUser(userId: string) {
    // Check and update suspension status if expired
    await this.checkAndUpdateSuspension(userId);

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        role: true,
        status: true,
        suspendedUntil: true,
      },
    });
  }

  async checkUsernameAvailability(checkUsernameDto: CheckUsernameDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: checkUsernameDto.username },
    });

    return {
      available: !existingUser,
      username: checkUsernameDto.username,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Token expires in 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: tokenExpiry,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken,
      );
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: resetPasswordDto.token,
        passwordResetTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }
}

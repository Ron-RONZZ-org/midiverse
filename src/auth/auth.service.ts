import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private turnstileService: TurnstileService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    // Verify Turnstile token if provided
    if (signUpDto.turnstileToken) {
      await this.turnstileService.verifyToken(signUpDto.turnstileToken);
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
      console.error('Failed to send verification email:', error);
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
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
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
    const payload = { sub: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      message: 'Email verified successfully',
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: true,
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
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, emailVerified: true },
    });
  }
}

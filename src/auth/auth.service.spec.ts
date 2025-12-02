import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { TurnstileService } from '../turnstile/turnstile.service';
import {
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockTurnstileService = {
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: TurnstileService,
          useValue: mockTurnstileService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    it('should create a new user and send verification email', async () => {
      const signUpDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };
      const hashedPassword = 'hashed_password';
      const mockUser = {
        id: 'user-id',
        email: signUpDto.email,
        username: signUpDto.username,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: 'token',
        emailVerificationTokenExpiry: new Date(),
      };

      // No existing email or username
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.signUp(signUpDto);

      expect(result).toEqual({
        message:
          'Account created successfully. Please check your email to verify your account.',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          emailVerified: false,
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const signUpDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        email: 'existing@example.com',
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'Email already registered. Please login instead.',
      );
    });

    it('should throw ConflictException if username already exists', async () => {
      const signUpDto = {
        email: 'new@example.com',
        username: 'existinguser',
        password: 'password123',
      };

      // Email check returns null (doesn't exist)
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      // Username check returns existing user
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        username: 'existinguser',
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'Username already taken. Please choose a different username.',
      );
    });

    it('should verify turnstile token if provided', async () => {
      const signUpDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        turnstileToken: 'turnstile-token',
      };
      const hashedPassword = 'hashed_password';
      const mockUser = {
        id: 'user-id',
        email: signUpDto.email,
        username: signUpDto.username,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken: 'token',
        emailVerificationTokenExpiry: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockTurnstileService.verifyToken.mockResolvedValue(true);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.signUp(signUpDto);

      expect(mockTurnstileService.verifyToken).toHaveBeenCalledWith(
        'turnstile-token',
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials and verified email', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: loginDto.username,
        password: 'hashed_password',
        emailVerified: true,
      };
      const mockToken = 'jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          emailVerified: true,
        },
      });
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        password: 'hashed_password',
        emailVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ username: 'testuser', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nonexistent', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        password: 'hashed_password',
        emailVerified: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'testuser', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and return access token', async () => {
      const verifyEmailDto = { token: 'verification-token' };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: false,
        emailVerificationToken: 'verification-token',
        emailVerificationTokenExpiry: new Date(Date.now() + 3600000),
      };
      const mockToken = 'jwt-token';

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.verifyEmail(verifyEmailDto);

      expect(result).toEqual({
        message: 'Email verified successfully',
        access_token: mockToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          emailVerified: true,
        },
      });
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: 'invalid-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user without password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        role: 'user',
        status: 'active',
        suspendedUntil: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('user-id');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
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
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available: true if username does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.checkUsernameAvailability({
        username: 'newuser',
      });

      expect(result).toEqual({
        available: true,
        username: 'newuser',
      });
    });

    it('should return available: false if username exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        username: 'existinguser',
      });

      const result = await service.checkUsernameAvailability({
        username: 'existinguser',
      });

      expect(result).toEqual({
        available: false,
        username: 'existinguser',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.message).toContain('If an account with that email exists');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return same message for non-existing user (to prevent enumeration)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('If an account with that email exists');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordResetToken: 'valid-token',
        passwordResetTokenExpiry: new Date(Date.now() + 3600000),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      });

      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'newpassword123',
      });

      expect(result.message).toContain('Password reset successfully');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid or expired token', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'invalid-token',
          password: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

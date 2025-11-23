import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { TurnstileService } from '../turnstile/turnstile.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
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
        },
      });
    });
  });
});

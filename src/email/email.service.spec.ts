import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

import * as nodemailer from 'nodemailer';

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: { sendMail: jest.Mock };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | number> = {
        EMAIL_HOST: 'smtp.gmail.com',
        EMAIL_PORT: 587,
        EMAIL_SECURE: 'false',
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'test-password',
        EMAIL_FROM: 'noreply@midiverse.com',
        EMAIL_LINK_BASEURL: 'http://localhost:3001',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create transporter with correct configuration including timeouts', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password',
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        requireTLS: true,
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
        },
        debug: false,
        logger: false,
      });
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test content',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@midiverse.com',
          to: 'recipient@example.com',
          subject: 'Test Subject - Midiverse',
          html: expect.stringContaining('Test Subject'),
        }),
      );
    });

    it('should throw error with message when send fails', async () => {
      const error = new Error('Greeting never received');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendEmail('recipient@example.com', 'Test Subject', 'Test'),
      ).rejects.toThrow('Failed to send email: Greeting never received');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendVerificationEmail(
        'user@example.com',
        'testuser',
        'verification-token-123',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@midiverse.com',
          to: 'user@example.com',
          subject: 'Verify Your Email - Midiverse',
          html: expect.stringContaining('testuser'),
        }),
      );

      // Verify the HTML contains the verification token and URL
      const sendMailCall = mockTransporter.sendMail.mock.calls[0] as [
        { html: string },
      ];
      const mailOptions = sendMailCall[0];
      expect(mailOptions.html).toContain('verification-token-123');
      expect(mailOptions.html).toContain('http://localhost:3001/verify-email');
    });

    it('should throw error with message when verification email fails', async () => {
      const error = new Error('Connection timeout');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendVerificationEmail('user@example.com', 'testuser', 'token'),
      ).rejects.toThrow(
        'Failed to send verification email: Connection timeout',
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendPasswordResetEmail(
        'user@example.com',
        'testuser',
        'reset-token-123',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@midiverse.com',
          to: 'user@example.com',
          subject: 'Reset Your Password - Midiverse',
          html: expect.stringContaining('testuser'),
        }),
      );

      // Verify the HTML contains the reset token and URL
      const sendMailCall = mockTransporter.sendMail.mock.calls[0] as [
        { html: string },
      ];
      const mailOptions = sendMailCall[0];
      expect(mailOptions.html).toContain('reset-token-123');
      expect(mailOptions.html).toContain(
        'http://localhost:3001/reset-password',
      );
    });

    it('should throw error with message when password reset email fails', async () => {
      const error = new Error('Connection timeout');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendPasswordResetEmail('user@example.com', 'testuser', 'token'),
      ).rejects.toThrow(
        'Failed to send password reset email: Connection timeout',
      );
    });
  });

  describe('generatePreferencesToken', () => {
    it('should generate a valid token', () => {
      const userId = 'test-user-id-123';
      const token = service.generatePreferencesToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different users', () => {
      const token1 = service.generatePreferencesToken('user-1');
      const token2 = service.generatePreferencesToken('user-2');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyPreferencesToken', () => {
    it('should verify a valid token and return userId', () => {
      const userId = 'test-user-id-123';
      const token = service.generatePreferencesToken(userId);
      const verifiedUserId = service.verifyPreferencesToken(token);

      expect(verifiedUserId).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const result = service.verifyPreferencesToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const result = service.verifyPreferencesToken(
        Buffer.from('only:two:parts:here').toString('base64url'),
      );
      expect(result).toBeNull();
    });

    it('should return null for tampered token', () => {
      const userId = 'test-user-id-123';
      const token = service.generatePreferencesToken(userId);

      // Decode, modify, and re-encode the token
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      parts[0] = 'different-user-id'; // Tamper with userId
      const tamperedToken = Buffer.from(parts.join(':')).toString('base64url');

      const result = service.verifyPreferencesToken(tamperedToken);
      expect(result).toBeNull();
    });
  });

  describe('sendEmail with userId', () => {
    it('should include preferences link when userId is provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test content',
        'user-123',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('email-preferences'),
          html: expect.stringContaining(
            'manage your communication preferences',
          ),
        }),
      );
    });
  });
});

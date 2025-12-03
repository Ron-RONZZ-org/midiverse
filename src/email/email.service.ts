import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT') || 587;
    const secure = this.configService.get<string>('EMAIL_SECURE') === 'true';
    // Allow disabling TLS verification for development/testing only
    const rejectUnauthorized =
      this.configService.get<string>('EMAIL_REJECT_UNAUTHORIZED') !== 'false';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
      // Connection timeouts to prevent "Greeting never received" errors
      connectionTimeout: 30000, // 30 seconds to establish connection
      greetingTimeout: 30000, // 30 seconds to receive greeting
      socketTimeout: 60000, // 60 seconds for socket inactivity
      // TLS configuration for STARTTLS (port 587)
      requireTLS: !secure && port === 587, // Require STARTTLS for port 587
      tls: {
        rejectUnauthorized, // Verify TLS certificates by default
        minVersion: 'TLSv1.2',
      },
      debug: false,
      logger: false,
    });
  }

  /**
   * Generate a preferences token for a user (used for email unsubscribe links)
   */
  generatePreferencesToken(userId: string): string {
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}`;
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      'your-secret-key-change-this-in-production';
    const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return Buffer.from(`${data}:${hmac}`).toString('base64url');
  }

  /**
   * Verify a preferences token and return the userId if valid
   * Token is valid for 30 days
   */
  verifyPreferencesToken(token: string): string | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 3) return null;

      const [userId, timestampStr, providedHmac] = parts;
      const timestamp = parseInt(timestampStr, 10);

      // Check if token is expired (30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > thirtyDaysMs) return null;

      // Verify HMAC
      const data = `${userId}:${timestampStr}`;
      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'your-secret-key-change-this-in-production';
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      if (providedHmac.length !== expectedHmac.length) return null;
      try {
        if (
          !crypto.timingSafeEqual(
            Buffer.from(providedHmac),
            Buffer.from(expectedHmac),
          )
        ) {
          return null;
        }
      } catch {
        return null;
      }

      return userId;
    } catch {
      return null;
    }
  }

  /**
   * Send a generic email with optional preferences management footer
   */
  async sendEmail(
    to: string,
    subject: string,
    text: string,
    userId?: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    let footerHtml = `
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This is an automated email from <a href="${appUrl}" style="color: #007bff;">Midiverse</a>.
      </p>
    `;
    let footerText = `\n\nThis is an automated email from Midiverse (${appUrl}).`;

    // Add preferences link if userId is provided
    if (userId) {
      const token = this.generatePreferencesToken(userId);
      const preferencesUrl = `${appUrl}/email-preferences?token=${token}`;
      footerHtml = `
        <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #e9ecef; padding-top: 15px;">
          This is an automated email from <a href="${appUrl}" style="color: #007bff;">Midiverse</a>. 
          <a href="${preferencesUrl}" style="color: #007bff;">Click here to unsubscribe or manage your communication preferences</a>.
        </p>
      `;
      footerText = `\n\nThis is an automated email from Midiverse (${appUrl}). To unsubscribe or manage your communication preferences, visit: ${preferencesUrl}`;
    }

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to,
      subject: `${subject} - Midiverse`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">${subject}</h2>
          <div style="white-space: pre-wrap;">${text}</div>
          ${footerHtml}
        </div>
      `,
      // Provide a plain-text fallback to ensure multipart/alternative is sent
      text: `${subject}\n\n${text}${footerText}`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${to}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  async sendVerificationEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Verify Your Email - Midiverse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff !important;">Welcome to Midiverse, ${username}!</h2>
          <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
          <p style="margin: 30px 0;">
            <!-- Button: table/bgcolor gives better compatibility across mail clients -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">
              <tr>
                <td bgcolor="#007bff" style="background-color:#007bff; border-radius:4px;">
                  <a href="${verificationUrl}" style="display:inline-block; padding:12px 24px; color:#ffffff !important; text-decoration:none; border-radius:4px;">Verify Email Address</a>
                </td>
              </tr>
            </table>
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
      // Plain-text fallback to ensure clients that prefer text show useful info
      text: `Welcome to Midiverse, ${username}!\n\nPlease verify your email address:\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send verification email to ${email}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(`Failed to send verification email: ${errorMessage}`);
    }
  }

  async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Reset Your Password - Midiverse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff !important;">Password Reset Request</h2>
          <p>Hi ${username},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="margin: 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">
              <tr>
                <td bgcolor="#007bff" style="background-color:#007bff; border-radius:4px;">
                  <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; color:#ffffff !important; text-decoration:none; border-radius:4px;">Reset Password</a>
                </td>
              </tr>
            </table>
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `Hi ${username},\n\nWe received a request to reset your password. Use the link below to reset it:\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, ignore this message.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send password reset email to ${email}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(`Failed to send password reset email: ${errorMessage}`);
    }
  }

  async sendEmailChangeVerificationEmail(
    newEmail: string,
    username: string,
    token: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationUrl = `${appUrl}/verify-email-change?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: newEmail,
      subject: 'Verify Your New Email Address - Midiverse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff !important;">Email Change Verification</h2>
          <p>Hi ${username},</p>
          <p>You have requested to change your email address on Midiverse to this address. Please verify this email by clicking the button below:</p>
          <p style="margin: 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left">
              <tr>
                <td bgcolor="#007bff" style="background-color:#007bff; border-radius:4px;">
                  <a href="${verificationUrl}" style="display:inline-block; padding:12px 24px; color:#ffffff !important; text-decoration:none; border-radius:4px;">Verify Email Address</a>
                </td>
              </tr>
            </table>
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't request this email change, you can safely ignore this email and your email address will remain unchanged.
          </p>
        </div>
      `,
      text: `Hi ${username},\n\nYou have requested to change your email address on Midiverse to this address. Verify it using this link:\n${verificationUrl}\n\nThis link will expire in 24 hours. If you didn't request this, ignore this email.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email change verification email sent to ${newEmail}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email change verification email to ${newEmail}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(
        `Failed to send email change verification email: ${errorMessage}`,
      );
    }
  }
}

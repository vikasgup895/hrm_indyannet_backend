import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { MailerService } from '../mailer/mailer.service';
import * as crypto from 'crypto';

type UserEntity = NonNullable<
  Awaited<ReturnType<PrismaService['user']['findUnique']>>
>;

export interface AuthResponse {
  access_token: string;
  role: UserEntity['role'];
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Fetch employee ID linked to this user
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    // ✅ Add employeeId in payload
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee?.id ?? null, // <-- Key fix
    };

    const token = await this.jwt.signAsync(payload);

    return {
      access_token: token,
      role: user.role,
      email: user.email,
    };
  }

  /**
   * 🔐 Forget Password Flow
   * Generates a reset token and sends it to the user's email
   */
  async forgetPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Security: Don't reveal if email exists
      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Store hashed token and expiry in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry,
      },
    });

    // Create reset URL (frontend should handle this)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email with reset link
    const emailHtml = this.generatePasswordResetEmail(
      user.email,
      resetUrl,
      resetToken,
    );

    try {
      await this.mailer.send(
        user.email,
        '🔐 Password Reset Request - Indyanet HRM',
        emailHtml,
      );
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new BadRequestException(
        `Email service error: ${error?.message || 'Failed to send reset email. Please check SMTP credentials in .env'}`
      );
    }

    return {
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };
  }

  /**
   * 🔐 Reset Password Flow
   * Validates reset token and updates password
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!token || token.trim() === '') {
      throw new BadRequestException('Invalid reset token');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    // Hash the provided token to match with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with matching token
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired reset token. Please request a new password reset.',
      );
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Send confirmation email
    const confirmationEmail = this.generatePasswordResetConfirmationEmail(
      user.email,
    );
    try {
      await this.mailer.send(
        user.email,
        '✅ Password Reset Successful - Indyanet HRM',
        confirmationEmail,
      );
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }

    return {
      message: 'Password has been successfully reset. Please login with your new password.',
    };
  }

  /**
   * Generate password reset email HTML
   */
  private generatePasswordResetEmail(
    email: string,
    resetUrl: string,
    token: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: white;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              margin: 20px 0;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            }
            .footer {
              background-color: #f3f4f6;
              padding: 15px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-radius: 0 0 8px 8px;
            }
            .warning {
              background-color: #fef2f2;
              border-left: 4px solid #dc2626;
              padding: 10px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your Indyanet HRM account (${email}).</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy this link in your browser:</p>
              <p><code>${resetUrl}</code></p>
              
              <div class="warning">
                <strong>⚠️ Security Note:</strong> This link will expire in 1 hour. If you did not request this password reset, please ignore this email or contact your administrator.
              </div>
              
              <p>If the button above doesn't work, you can also paste the following token in the password reset form:</p>
              <p><code>${token}</code></p>
              
              <p>Best regards,<br>Indyanet HRM Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Indyanet. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate password reset confirmation email HTML
   */
  private generatePasswordResetConfirmationEmail(email: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #10b981;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              padding: 20px;
              background-color: white;
            }
            .success-box {
              background-color: #ecfdf5;
              border-left: 4px solid #10b981;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background-color: #f3f4f6;
              padding: 15px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-radius: 0 0 8px 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Reset Successful</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your password has been successfully reset!</p>
              <div class="success-box">
                <p><strong>Your password has been changed successfully.</strong></p>
                <p>You can now login to your Indyanet HRM account with your new password.</p>
              </div>
              
              <p>If you did not make this change, please contact your administrator immediately.</p>
              <p>Best regards,<br>Indyanet HRM Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Indyanet. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

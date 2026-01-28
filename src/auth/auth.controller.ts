/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
// eslint-disable-next-line prettier/prettier
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * 🔐 User login endpoint
   * Accepts email + password, returns JWT + role
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(body.email, body.password);
  }

  /**
   * 🔐 Forget Password endpoint
   * Sends a password reset link to the user's email
   */
  @Post('forgot-password')
  @HttpCode(200)
  async forgetPassword(@Body() body: ForgetPasswordDto) {
    return this.auth.forgetPassword(body.email);
  }

  /**
   * 🔐 Reset Password endpoint
   * Validates reset token and updates the user's password
   */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  /**
   * ✅ Token validation endpoint
   * Validates JWT token and returns user info
   */
  @Get('validate')
  @UseGuards(AuthGuard('jwt'))
  async validate(@CurrentUser() user: any) {
    return {
      valid: true,
      user: {
        id: user.sub,
        role: user.role,
        email: user.email,
      },
    };
  }

  @Get('health')
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }
}

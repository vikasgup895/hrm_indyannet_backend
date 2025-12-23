import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

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
}

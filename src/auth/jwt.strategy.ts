import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: string;
  email?: string;
  employeeId?: string; // ✅ Include employee ID for employee-specific queries
}

export interface AuthenticatedUser {
  sub: string;
  role: string;
  email?: string;
  employeeId?: string; // ✅ Matches Prisma employee relation
}

// 👇 Properly typed JWT extractor
const jwtExtractor: JwtFromRequestFunction =
  ExtractJwt.fromAuthHeaderAsBearerToken() as unknown as JwtFromRequestFunction;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: jwtExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  /**
   * ✅ Validate JWT payload and attach user context
   * This object will become available as `req.user` in controllers
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
      employeeId: payload.employeeId ?? undefined, // 🧠 optional fallback
    };
  }
}

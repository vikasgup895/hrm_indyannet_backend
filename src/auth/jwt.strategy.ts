import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: 'EMPLOYEE' | 'HR' | 'ADMIN' | 'MD' | 'CAO';
  email?: string;
  employeeId?: string;
}

export interface AuthenticatedUser {
  sub: string;
  role: 'EMPLOYEE' | 'HR' | 'ADMIN' | 'MD' | 'CAO';
  email?: string;
  employeeId?: string;
}

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
   * ✅ Validate JWT payload and attach normalized user context
   * This object will become available as `req.user` in controllers
   *
   * Ensures consistent user object structure:
   * {
   *   sub: string (user ID);
   *   role: "EMPLOYEE" | "HR" | "ADMIN" | "MD" | "CAO";
   *   email?: string;
   *   employeeId?: string;
   * }
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      sub: payload.sub,
      role: payload.role || 'EMPLOYEE',
      email: payload.email,
      employeeId: payload.employeeId,
    };
  }
}

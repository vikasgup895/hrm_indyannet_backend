import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUser = { sub: string; role: string; email?: string };

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const req = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return req.user as JwtUser; // set by JwtStrategy
  },
);

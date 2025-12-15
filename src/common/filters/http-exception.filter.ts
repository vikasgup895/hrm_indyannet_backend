import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global HTTP Exception Filter
 * - Standardizes error responses
 * - Hides internal details in production
 * - Adds basic Prisma error mapping
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProd = process.env.NODE_ENV === 'production';

    // Default values
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    // Nest HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
      } else if (resp && typeof resp === 'object') {
        const obj = resp as Record<string, unknown>;
        // Prefer message from payload if present
        message = (obj.message as string) || message;
        code = (obj['code'] as string) || code;
      }
    }

    // Prisma known errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      // Map common Prisma error codes
      switch (exception.code) {
        case 'P2002':
          code = 'UNIQUE_CONSTRAINT_VIOLATION';
          message = 'Duplicate record violates unique constraint';
          break;
        case 'P2003':
          code = 'FOREIGN_KEY_CONSTRAINT_FAILED';
          message = 'Related record constraint failed';
          break;
        case 'P2025':
          code = 'RECORD_NOT_FOUND';
          message = 'The requested record was not found';
          status = HttpStatus.NOT_FOUND;
          break;
        default:
          code = `PRISMA_${exception.code}`;
          message = 'Database request error';
      }
    }

    // Generic Error
    else if (exception instanceof Error) {
      message = exception.message || message;
      code = 'UNHANDLED_ERROR';
    }

    const payload: Record<string, unknown> = {
      success: false,
      statusCode: status,
      error: {
        code,
        message,
      },
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // Include stack trace only in non-production for debugging
    if (!isProd && exception instanceof Error) {
      payload['stack'] = exception.stack;
    }

    response.status(status).json(payload);
  }
}

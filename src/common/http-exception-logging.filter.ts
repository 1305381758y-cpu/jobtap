import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { resolveRequestSource } from './request-source';

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';
    const body = typeof response === 'object'
      ? response
      : { statusCode: status, message: response };

    if (status >= 500 || req.path === '/api/admin/login' || req.path === '/api/employer/jobs') {
      const message = exception instanceof Error ? exception.message : String(exception);
      this.logger.warn({
        message,
        method: req.method,
        path: req.path,
        status,
        source: resolveRequestSource(req),
      });
    }

    res.status(status).json(body);
  }
}

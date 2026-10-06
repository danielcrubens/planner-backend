import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Formato único de erro: { statusCode, message, error, path, timestamp }.
 * Mapeia erros conhecidos do Prisma para HTTP; nunca vaza stack em produção.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        message = (body as { message?: string | string[] }).message ?? exception.message;
        code = (body as { code?: string }).code;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      message = mapped.message;
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      statusCode: status,
      ...(code ? { code } : {}),
      message,
      error: HttpStatus[status],
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapPrismaError(e: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    switch (e.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: 'Registro duplicado' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' };
      default:
        this.logger.error(e.message);
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno do servidor' };
    }
  }
}

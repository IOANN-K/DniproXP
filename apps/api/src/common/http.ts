import { randomUUID } from 'node:crypto';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  applyDecorators,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { User } from '../database/entities/user.entity.js';
export type Principal = { user: User; sessionId: string };
export interface ApiRequest extends Request {
  principal?: Principal;
  requestId?: string;
}
export class ErrorDetailDto {
  @ApiProperty() code: string;
  @ApiProperty() message: string;
  @ApiProperty({ format: 'uuid' }) requestId: string;
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
  })
  fields?: Record<string, string[]>;
  @ApiPropertyOptional() retryAfterSeconds?: number;
}
export class ApiErrorDto {
  @ApiProperty({ type: ErrorDetailDto }) error: ErrorDetailDto;
}
export function ApiErrors() {
  return applyDecorators(
    ...[400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503].map((status) =>
      ApiResponse({
        status,
        type: ApiErrorDto,
        description: HttpStatus[status] ?? 'Error',
      }),
    ),
  );
}
export class DomainError extends HttpException {
  constructor(
    status: number,
    code: string,
    message: string,
    extras: {
      fields?: Record<string, string[]>;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super({ code, message, ...extras }, status);
  }
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const req = context.getRequest<ApiRequest>();
    const res = context.getResponse<Response>();
    const payload =
      error instanceof HttpException ? error.getResponse() : undefined;
    // Driver errors are never serialized (they can contain SQL parameters).
    const driver =
      isObject(error) && isObject(error.driverError)
        ? error.driverError
        : undefined;
    const conflict = driver?.code === '23505';
    const parserStatus =
      isObject(error) &&
      typeof error.status === 'number' &&
      [400, 413, 415].includes(error.status)
        ? error.status
        : undefined;
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : conflict
          ? 409
          : (parserStatus ?? 500);
    const defaults: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'VALIDATION_FAILED',
      429: 'RATE_LIMITED',
      503: 'UNAVAILABLE',
    };
    const code =
      isObject(payload) && typeof payload.code === 'string'
        ? payload.code
        : (defaults[status] ?? 'INTERNAL_ERROR');
    const message =
      isObject(payload) && typeof payload.message === 'string'
        ? payload.message
        : status >= 500
          ? 'Сервіс тимчасово недоступний.'
          : conflict
            ? 'Запис із такими даними вже існує.'
            : 'Запит неможливо виконати.';
    const requestId = req.requestId ?? randomUUID();
    if (status >= 500) this.logger.error(`${code}; requestId=${requestId}`);
    if (isObject(payload) && typeof payload.retryAfterSeconds === 'number')
      res.setHeader('Retry-After', payload.retryAfterSeconds);
    res.status(status).json({
      error: {
        code,
        message,
        requestId,
        ...(isObject(payload) && isObject(payload.fields)
          ? { fields: payload.fields }
          : {}),
        ...(isObject(payload) && typeof payload.retryAfterSeconds === 'number'
          ? { retryAfterSeconds: payload.retryAfterSeconds }
          : {}),
      },
    });
  }
}

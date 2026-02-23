import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../../lib/errors';
import { getLogger } from '../../lib/logger';
import { ApiResponse } from '../../types';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const logger = getLogger();

  // Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      },
    };

    res.status(400).json(response);
    return;
  }

  // Custom app errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Server error');
    } else {
      logger.warn({ code: err.code, message: err.message, path: req.path }, 'Client error');
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError && { details: err.details }),
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Prisma known errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: Record<string, unknown> };
    logger.warn({ code: prismaErr.code, meta: prismaErr.meta }, 'Prisma error');

    if (prismaErr.code === 'P2002') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with that value already exists',
        },
      };
      res.status(409).json(response);
      return;
    }

    if (prismaErr.code === 'P2025') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      };
      res.status(404).json(response);
      return;
    }
  }

  // Unknown errors
  logger.error({ err, path: req.path, method: req.method, stack: err.stack }, 'Unhandled error');

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  };

  res.status(500).json(response);
}

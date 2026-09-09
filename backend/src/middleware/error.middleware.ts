/**
 * Global Error Handler Middleware
 * Centralized error handling for the entire application
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Prisma error types
interface PrismaError extends Error {
  code?: string;
  meta?: {
    target?: string[];
    field_name?: string;
  };
}

/**
 * Handle Prisma-specific errors
 */
const handlePrismaError = (error: PrismaError) => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field';
      return new AppError(`A record with this ${field} already exists`, 409);
    case 'P2025':
      // Record not found
      return new AppError('Record not found', 404);
    case 'P2003':
      // Foreign key constraint
      return new AppError('Related record not found', 404);
    case 'P2014':
      // Invalid relation
      return new AppError('Invalid relation', 400);
    default:
      return new AppError('Database error occurred', 500);
  }
};

/**
 * 404 Not Found handler - for routes not matched
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

/**
 * Global error handler middleware
 * Must be registered LAST in Express middleware chain
 */
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.email || 'unauthenticated',
  });

  // Handle known error types
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if ((error as PrismaError).code?.startsWith('P')) {
    // Prisma error
    appError = handlePrismaError(error as PrismaError);
  } else if (error.name === 'ValidationError') {
    appError = new AppError(error.message, 400);
  } else if (error.name === 'UnauthorizedError') {
    appError = new AppError('Invalid or expired token', 401);
  } else if (error.name === 'MulterError') {
    const multerError = error as Error & { code: string };
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      appError = new AppError('File size too large. Maximum 5MB allowed', 400);
    } else {
      appError = new AppError('File upload error', 400);
    }
  } else {
    // Unknown error - don't leak details in production
    appError = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : error.message,
      500
    );
  }

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};

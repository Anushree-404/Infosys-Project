/**
 * API Response Utility
 * Standardized response format for all API endpoints
 */

import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: PaginationMeta
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: ValidationError[]
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errors && errors.length > 0 && { errors }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  message: string,
  data?: T
): Response => {
  return sendSuccess(res, message, data, 201);
};

/**
 * Send unauthorized response (401)
 */
export const sendUnauthorized = (res: Response, message = 'Unauthorized'): Response => {
  return sendError(res, message, 401);
};

/**
 * Send forbidden response (403)
 */
export const sendForbidden = (res: Response, message = 'Forbidden'): Response => {
  return sendError(res, message, 403);
};

/**
 * Send not found response (404)
 */
export const sendNotFound = (res: Response, message = 'Resource not found'): Response => {
  return sendError(res, message, 404);
};

/**
 * Send server error response (500)
 */
export const sendServerError = (res: Response, message = 'Internal server error'): Response => {
  return sendError(res, message, 500);
};

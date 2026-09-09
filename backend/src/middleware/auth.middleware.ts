/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/apiResponse';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

/**
 * Authenticate user via JWT Bearer token
 * Checks Authorization header: "Bearer <token>"
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      sendUnauthorized(res, 'No authentication token provided');
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user still exists and is active (optional - adds DB call but increases security)
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      sendUnauthorized(res, 'User account not found or deactivated');
      return;
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      sendUnauthorized(res, 'Token has expired. Please login again.');
    } else if (err.name === 'JsonWebTokenError') {
      sendUnauthorized(res, 'Invalid token. Please login again.');
    } else {
      logger.error('Authentication error:', error);
      sendUnauthorized(res, 'Authentication failed');
    }
  }
};

/**
 * Optional authentication - attaches user if token present but doesn't fail if not
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    // Ignore errors - user is just not authenticated
  }

  next();
};

/**
 * Role-based access control middleware factory
 * @param roles - Allowed roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Not authenticated');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(
        res,
        `Access denied. Required roles: ${roles.join(', ')}`
      );
      return;
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize('ADMIN');

/**
 * Farmer only middleware
 */
export const farmerOnly = authorize('FARMER', 'ADMIN');

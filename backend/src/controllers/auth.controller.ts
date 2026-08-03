/**
 * Authentication Controller
 * Handles HTTP request/response for auth endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
} from '../utils/apiResponse';
import { Language } from '@prisma/client';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new farmer
 *     description: Creates a new farmer account and returns JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, confirmPassword]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Rajesh Kumar"
 *               email:
 *                 type: string
 *                 example: "rajesh@example.com"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               password:
 *                 type: string
 *                 example: "SecurePass@123"
 *               confirmPassword:
 *                 type: string
 *                 example: "SecurePass@123"
 *               state:
 *                 type: string
 *                 example: "Andhra Pradesh"
 *               district:
 *                 type: string
 *                 example: "Krishna"
 *               preferredLanguage:
 *                 type: string
 *                 example: "TELUGU"
 *     responses:
 *       201:
 *         description: Registration successful
 *       409:
 *         description: Email already exists
 *       422:
 *         description: Validation failed
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, phone, password, state, district, preferredLanguage } = req.body;

    const result = await authService.registerUser({
      fullName,
      email,
      phone,
      password,
      state,
      district,
      preferredLanguage: preferredLanguage as Language,
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendCreated(res, 'Account created successfully! Welcome aboard.', {
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "rajesh@example.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass@123"
 *               rememberMe:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    const result = await authService.loginUser({
      email,
      password,
      rememberMe,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Set refresh token cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe
        ? 30 * 24 * 60 * 60 * 1000  // 30 days if remember me
        : 7 * 24 * 60 * 60 * 1000,  // 7 days default
    });

    sendSuccess(res, 'Login successful', {
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const userId = req.user?.userId;

    await authService.logoutUser(refreshToken, userId);

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Uses refresh token from cookie or body to generate new access token
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid refresh token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get refresh token from cookie or body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      sendError(res, 'Refresh token not provided', 401);
      return;
    }

    const result = await authService.refreshAccessToken(token);

    sendSuccess(res, 'Token refreshed successfully', {
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "rajesh@example.com"
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists)
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (authenticated)
 *     security:
 *       - bearerAuth: []
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    // Clear refresh token cookie to force re-login
    res.clearCookie('refreshToken');

    sendSuccess(res, result.message);
  } catch (error) {
    next(error);
  }
};

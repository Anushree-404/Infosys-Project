/**
 * Authentication Service
 * Business logic for user authentication
 */

import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokenPair, generateAccessToken } from '../utils/jwt';
import { verifyRefreshToken } from '../utils/jwt';
import { generateSecureToken } from '../utils/crypto';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email';
import { getRefreshTokenExpiry, getPasswordResetExpiry } from '../config/jwt';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { Language, Role } from '@prisma/client';

interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  state?: string;
  district?: string;
  preferredLanguage?: Language;
}

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: string;
  ipAddress?: string;
}

/**
 * Register a new farmer
 */
export const registerUser = async (input: RegisterInput) => {
  const { fullName, email, phone, password, state, district, preferredLanguage } = input;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Check if phone already exists (if provided)
  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists', 409);
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user in database
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phone: phone || null,
      passwordHash,
      state: state || null,
      district: district || null,
      preferredLanguage: preferredLanguage || Language.ENGLISH,
      role: Role.FARMER,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      state: true,
      district: true,
      preferredLanguage: true,
      createdAt: true,
    },
  });

  // Generate token pair
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // Send welcome email (non-blocking)
  sendWelcomeEmail(user.email, user.fullName).catch((err) =>
    logger.error('Welcome email failed:', err)
  );

  return { user, tokens };
};

/**
 * Login user
 */
export const loginUser = async (input: LoginInput) => {
  const { email, password, deviceInfo, ipAddress } = input;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
  });

  if (!user) {
    // Use generic message to prevent email enumeration
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
      deviceInfo: deviceInfo || null,
      ipAddress: ipAddress || null,
    },
  });

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const userPublic = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePhoto: user.profilePhoto,
    state: user.state,
    district: user.district,
    preferredLanguage: user.preferredLanguage,
    isEmailVerified: user.isEmailVerified,
  };

  return { user: userPublic, tokens };
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  // Verify refresh token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check refresh token exists in DB and is not revoked
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: refreshToken,
      userId: decoded.userId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AppError('Refresh token has been revoked or expired', 401);
  }

  if (!storedToken.user.isActive || storedToken.user.deletedAt) {
    throw new AppError('User account is not active', 403);
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    userId: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  return { accessToken };
};

/**
 * Logout - revoke refresh token
 */
export const logoutUser = async (refreshToken?: string, userId?: string) => {
  if (refreshToken) {
    // Revoke specific refresh token
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, userId },
      data: { isRevoked: true },
    });
  } else if (userId) {
    // Revoke all refresh tokens for user (logout from all devices)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }
};

/**
 * Forgot password - generate and send reset token
 */
export const forgotPassword = async (email: string) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return { message: 'If an account with this email exists, a reset link has been sent.' };
  }

  // Invalidate previous reset tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true },
  });

  // Generate secure token
  const resetToken = generateSecureToken(64);

  // Store in DB
  await prisma.passwordReset.create({
    data: {
      token: resetToken,
      userId: user.id,
      expiresAt: getPasswordResetExpiry(),
    },
  });

  // Send email
  await sendPasswordResetEmail(user.email, user.fullName, resetToken);

  return { message: 'If an account with this email exists, a reset link has been sent.' };
};

/**
 * Reset password using token
 */
export const resetPassword = async (token: string, newPassword: string) => {
  // Find valid reset token
  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      token,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!resetRecord) {
    throw new AppError('Invalid or expired password reset token', 400);
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and mark token as used (transaction)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { isUsed: true },
    }),
    // Revoke all refresh tokens (force re-login on all devices)
    prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { isRevoked: true },
    }),
  ]);

  return { message: 'Password has been reset successfully' };
};

/**
 * Change password (authenticated user)
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Hash and update
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    // Revoke all refresh tokens except current
    prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    }),
  ]);

  return { message: 'Password changed successfully' };
};

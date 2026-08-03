/**
 * Crypto Utility
 * Secure token generation for password reset, etc.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 */
export const generateSecureToken = (length = 64): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a short numeric OTP
 */
export const generateOTP = (digits = 6): string => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

/**
 * Hash a token for safe storage (not for passwords - use bcrypt for that)
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * JWT Configuration
 * Centralized JWT settings and helper functions
 */

export const jwtConfig = {
  // Access token - short lived
  accessToken: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  // Refresh token - long lived
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET as string,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};

/**
 * Get refresh token expiry in milliseconds for database storage
 */
export const getRefreshTokenExpiry = (): Date => {
  const days = 7; // 7 days
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

/**
 * Get password reset token expiry (1 hour)
 */
export const getPasswordResetExpiry = (): Date => {
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
};

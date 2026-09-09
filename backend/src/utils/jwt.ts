/**
 * JWT Utility Functions
 * Token generation, verification, and management
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, jwtConfig.accessToken.secret, {
    expiresIn: jwtConfig.accessToken.expiresIn,
    issuer: 'irrigation-system',
    audience: 'irrigation-users',
  } as SignOptions);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, jwtConfig.refreshToken.secret, {
    expiresIn: jwtConfig.refreshToken.expiresIn,
    issuer: 'irrigation-system',
    audience: 'irrigation-users',
  } as SignOptions);
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): DecodedToken => {
  return jwt.verify(token, jwtConfig.accessToken.secret, {
    issuer: 'irrigation-system',
    audience: 'irrigation-users',
  }) as DecodedToken;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): DecodedToken => {
  return jwt.verify(token, jwtConfig.refreshToken.secret, {
    issuer: 'irrigation-system',
    audience: 'irrigation-users',
  }) as DecodedToken;
};

/**
 * Decode token without verification (for reading claims)
 */
export const decodeToken = (token: string): DecodedToken | null => {
  return jwt.decode(token) as DecodedToken | null;
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: TokenPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

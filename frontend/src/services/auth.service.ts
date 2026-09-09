/**
 * Authentication API Service
 * Calls backend auth endpoints
 */

import api, { setAccessToken, clearAccessToken } from './api';
import type {
  ApiResponse,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  User,
  AuthTokens,
} from '@/types';

interface AuthResponse {
  user: User;
  accessToken: string;
}

/**
 * Register new farmer
 */
export const register = async (data: RegisterInput): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
  const { user, accessToken } = response.data.data!;
  setAccessToken(accessToken);
  return { user, accessToken };
};

/**
 * Login user
 */
export const login = async (data: LoginInput): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
  const { user, accessToken } = response.data.data!;
  setAccessToken(accessToken);
  return { user, accessToken };
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (data: ForgotPasswordInput): Promise<string> => {
  const response = await api.post<ApiResponse>('/auth/forgot-password', data);
  return response.data.message;
};

/**
 * Reset password
 */
export const resetPassword = async (data: ResetPasswordInput): Promise<string> => {
  const response = await api.post<ApiResponse>('/auth/reset-password', data);
  return response.data.message;
};

/**
 * Change password (authenticated)
 */
export const changePassword = async (data: ChangePasswordInput): Promise<string> => {
  const response = await api.post<ApiResponse>('/auth/change-password', data);
  clearAccessToken(); // Force re-login
  return response.data.message;
};

/**
 * Refresh access token
 */
export const refreshToken = async (): Promise<string> => {
  const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
  const { accessToken } = response.data.data!;
  setAccessToken(accessToken);
  return accessToken;
};

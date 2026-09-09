/**
 * Profile API Service
 */

import api from './api';
import type { ApiResponse, User } from '@/types';

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<User> => {
  const response = await api.get<ApiResponse<User>>('/profile');
  return response.data.data!;
};

/**
 * Update profile
 */
export const updateProfile = async (data: Partial<User>): Promise<User> => {
  const response = await api.put<ApiResponse<User>>('/profile', data);
  return response.data.data!;
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('profilePhoto', file);

  const response = await api.post<ApiResponse<User>>('/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data!;
};

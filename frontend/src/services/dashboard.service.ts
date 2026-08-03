/**
 * Dashboard API Service
 */

import api from './api';
import type { ApiResponse, DashboardData } from '@/types';

/**
 * Get dashboard data
 */
export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get<ApiResponse<DashboardData>>('/dashboard');
  return response.data.data!;
};

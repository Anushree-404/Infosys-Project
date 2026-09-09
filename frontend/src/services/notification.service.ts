/**
 * Notification API Service - Phase 2
 */

import api from './api';
import type { ApiResponse } from '@/types';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const getNotifications = async (unreadOnly = false): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> => {
  const res = await api.get<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>(
    '/notifications',
    { params: unreadOnly ? { unread: 'true' } : {} }
  );
  return res.data.data!;
};

export const markAsRead = async (id: string): Promise<void> => {
  await api.put(`/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await api.put('/notifications/read-all');
};

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};

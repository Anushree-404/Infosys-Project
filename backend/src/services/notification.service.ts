/**
 * Notification Service - Phase 2
 * Creates and manages user notifications for sensor alerts, weather, etc.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: object;
}

export const createNotification = async (input: CreateNotificationInput) => {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? 'INFO',
        metadata: input.metadata,
      },
    });
  } catch (err) {
    logger.error('Failed to create notification:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const getNotifications = async (userId: string, unreadOnly = false) => {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

export const markAsRead = async (id: string, userId: string) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const deleteNotification = async (id: string, userId: string) => {
  return prisma.notification.deleteMany({ where: { id, userId } });
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.notification.count({ where: { userId, isRead: false } });
};

// ── Alert generators called by scheduler ──────────────────────

export const createSensorOfflineAlert = async (userId: string, sensorName: string, fieldName: string) => {
  return createNotification({
    userId,
    title: 'Sensor Offline',
    message: `${sensorName} in ${fieldName} has not reported data for over 1 hour.`,
    type: 'WARNING',
    metadata: { sensorName, fieldName },
  });
};

export const createLowBatteryAlert = async (userId: string, sensorName: string, batteryLevel: number) => {
  return createNotification({
    userId,
    title: 'Low Battery',
    message: `${sensorName} battery is at ${batteryLevel}%. Please replace or recharge.`,
    type: 'ALERT',
    metadata: { sensorName, batteryLevel },
  });
};

export const createLowMoistureAlert = async (userId: string, fieldName: string, moisture: number) => {
  return createNotification({
    userId,
    title: 'Low Soil Moisture',
    message: `${fieldName} soil moisture is at ${moisture}%. Consider irrigation.`,
    type: 'ALERT',
    metadata: { fieldName, moisture },
  });
};

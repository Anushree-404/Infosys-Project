/**
 * Notification Controller - Phase 2
 */

import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { sendSuccess } from '../utils/apiResponse';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await notificationService.getNotifications(req.user!.id, unreadOnly);
    const unreadCount = await notificationService.getUnreadCount(req.user!.id);
    sendSuccess(res, 'Notifications fetched', { notifications, unreadCount });
  } catch (err) { next(err); }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user!.id);
    sendSuccess(res, 'Notification marked as read');
  } catch (err) { next(err); }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, 'All notifications marked as read');
  } catch (err) { next(err); }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user!.id);
    sendSuccess(res, 'Notification deleted');
  } catch (err) { next(err); }
};

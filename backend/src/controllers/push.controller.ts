/**
 * Push Notification Controller - Milestone 3
 */

import { Request, Response, NextFunction } from 'express';
import * as pushService from '../services/push.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getVapidKey = (_req: Request, res: Response) => {
  const key = pushService.getVapidPublicKey();
  if (!key) return sendError(res, 'Push notifications not configured', 503);
  sendSuccess(res, 'VAPID public key', { publicKey: key });
};

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return sendError(res, 'Invalid subscription object', 400);
    }
    const userAgent = req.headers['user-agent'] ?? undefined;
    const sub = await pushService.saveSubscription(req.user!.id, { endpoint, keys }, userAgent);
    sendSuccess(res, 'Subscribed to push notifications', sub, 201);
  } catch (err) { next(err); }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return sendError(res, 'endpoint required', 400);
    await pushService.deleteSubscription(endpoint, req.user!.id);
    sendSuccess(res, 'Unsubscribed');
  } catch (err) { next(err); }
};

// Test endpoint — sends a push + creates in-app notification for the current user
export const testPush = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { createNotification } = await import('../services/notification.service');
    await createNotification({
      userId: req.user!.id,
      title: 'Test Notification',
      message: 'Your push notifications are working correctly! 🎉',
      type: 'SUCCESS',
      metadata: { test: true },
    });
    await pushService.sendPushToUser(req.user!.id, {
      title: 'IrriSmart — Test Alert',
      body: 'Push notifications are working correctly!',
      tag: 'test',
      url: '/dashboard/notifications',
    });
    sendSuccess(res, 'Test notification sent');
  } catch (err) { next(err); }
};

/**
 * Web Push Service - Milestone 3
 */

import webpush from 'web-push';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || 'mailto:admin@irrismart.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload { title: string; body: string; tag?: string; url?: string; }

export const sendPushToUser = async (userId: string, payload: PushPayload): Promise<void> => {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    logger.debug('[Push] VAPID keys not configured — skipping push');
    return;
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      const e = err as { statusCode?: number };
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        // Subscription expired — remove it
        await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
      } else {
        logger.warn('[Push] send failed:', err instanceof Error ? err.message : err);
      }
    }
  }
};

export const saveSubscription = async (
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
) => {
  return prisma.pushSubscription.upsert({
    where:  { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
  });
};

export const deleteSubscription = async (endpoint: string, userId: string) => {
  return prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
};

export const getVapidPublicKey = () => VAPID_PUBLIC;

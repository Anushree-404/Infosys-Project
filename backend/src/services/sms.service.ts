/**
 * SMS Service (Twilio) - Milestone 3
 */

import { logger } from '../utils/logger';

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID  || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN    || '';
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER  || '';

export const sendSmsAlert = async (to: string, message: string): Promise<void> => {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    logger.debug('[SMS] Twilio credentials not configured — skipping SMS');
    return;
  }
  try {
    // Dynamic import to avoid errors when twilio is not configured
    const twilio = await import('twilio');
    const client = twilio.default(TWILIO_SID, TWILIO_TOKEN);
    await client.messages.create({ to, from: TWILIO_FROM, body: message.slice(0, 160) });
    logger.info(`[SMS] Sent to ${to}`);
  } catch (err) {
    logger.error('[SMS] Send failed:', err instanceof Error ? err.message : err);
  }
};

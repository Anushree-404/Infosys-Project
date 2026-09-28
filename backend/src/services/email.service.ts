/**
 * Email Service (SendGrid) - Milestone 3
 * Falls back to existing nodemailer if SendGrid not configured.
 */

import { logger } from '../utils/logger';
import type { AlertSeverity } from './alert.service';

const SENDGRID_KEY  = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM    = process.env.EMAIL_FROM || 'noreply@irrismart.com';

export const sendEmailAlert = async (
  to: string,
  subject: string,
  body: string,
  severity: AlertSeverity
): Promise<void> => {
  if (!SENDGRID_KEY) {
    logger.debug('[Email] SendGrid API key not configured — skipping email alert');
    return;
  }
  try {
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(SENDGRID_KEY);
    const severityColor = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a' }[severity];
    await sgMail.default.send({
      to,
      from: EMAIL_FROM,
      subject: `[IrriSmart ${severity}] ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:${severityColor};color:white;padding:16px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">${subject}</h2>
            <span style="font-size:12px;opacity:0.9">Severity: ${severity}</span>
          </div>
          <div style="padding:16px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 12px">${body}</p>
            <p style="margin:0;font-size:12px;color:#6b7280">IrriSmart AI Irrigation System</p>
          </div>
        </div>`,
    });
    logger.info(`[Email] Alert sent to ${to}`);
  } catch (err) {
    logger.error('[Email] Send failed:', err instanceof Error ? err.message : err);
  }
};

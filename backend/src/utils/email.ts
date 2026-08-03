/**
 * Email Utility
 * Nodemailer email sending with templates
 */

import nodemailer from 'nodemailer';
import { logger } from './logger';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using nodemailer
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Irrigation System" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId} to ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Email sending failed:', error);
    return false;
  }
};

/**
 * Password reset email template
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0fdf4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 40px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Irrigation System</h1>
                  <p style="color: #bbf7d0; margin: 8px 0 0 0; font-size: 14px;">AI-Based Farm Management</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #166534; margin: 0 0 16px 0;">Reset Your Password</h2>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${name},</p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password.
                    This link will expire in <strong>1 hour</strong>.
                  </p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" 
                       style="background: #16a34a; color: white; padding: 16px 32px; border-radius: 8px; 
                              text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                      Reset Password
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">
                    If you didn't request this, please ignore this email. Your password will not be changed.
                  </p>
                  <p style="color: #6b7280; font-size: 14px;">
                    Or copy this link: <a href="${resetUrl}" style="color: #16a34a;">${resetUrl}</a>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2024 AI Irrigation Management System. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Password - Irrigation System',
    html,
  });
};

/**
 * Welcome email template after registration
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0fdf4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 40px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🌱 Welcome to Irrigation System!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #166534;">Welcome, ${name}! 👋</h2>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Your account has been created successfully. You can now start managing your farms with AI-powered irrigation recommendations.
                  </p>
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${loginUrl}" 
                       style="background: #16a34a; color: white; padding: 16px 32px; border-radius: 8px; 
                              text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                      Go to Dashboard
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 AI Irrigation Management System.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🌱 Welcome to AI Irrigation Management System!',
    html,
  });
};

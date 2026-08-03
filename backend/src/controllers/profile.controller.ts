/**
 * Profile Controller
 * Handles user profile HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import * as profileService from '../services/profile.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { uploadProfilePhoto } from '../middleware/upload.middleware';
import { Language } from '@prisma/client';

/**
 * @swagger
 * /api/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const profile = await profileService.getUserProfile(userId);
    sendSuccess(res, 'Profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               state:
 *                 type: string
 *               district:
 *                 type: string
 *               preferredLanguage:
 *                 type: string
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { fullName, phone, state, district, preferredLanguage } = req.body;

    const updatedProfile = await profileService.updateUserProfile(userId, {
      fullName,
      phone,
      state,
      district,
      preferredLanguage: preferredLanguage as Language,
    });

    sendSuccess(res, 'Profile updated successfully', updatedProfile);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/profile/photo:
 *   post:
 *     tags: [Profile]
 *     summary: Upload profile photo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 */
export const uploadPhoto = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  uploadProfilePhoto(req, res, async (err) => {
    if (err) {
      sendError(res, err.message, 400);
      return;
    }

    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', 400);
        return;
      }

      const userId = req.user!.userId;
      // Store relative path for serving
      const filePath = `uploads/profiles/${req.file.filename}`;

      const updated = await profileService.updateProfilePhoto(userId, filePath);
      sendSuccess(res, 'Profile photo updated successfully', updated);
    } catch (error) {
      next(error);
    }
  });
};

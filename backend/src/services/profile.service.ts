/**
 * Profile Service
 * Business logic for user profile management
 */

import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { deleteFile } from '../middleware/upload.middleware';
import { Language } from '@prisma/client';

interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  state?: string;
  district?: string;
  preferredLanguage?: Language;
}

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      profilePhoto: true,
      state: true,
      district: true,
      preferredLanguage: true,
      isEmailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          fields: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, input: UpdateProfileInput) => {
  const { fullName, phone, state, district, preferredLanguage } = input;

  // If phone is provided, check uniqueness
  if (phone) {
    const existingUser = await prisma.user.findFirst({
      where: { phone, id: { not: userId } },
    });
    if (existingUser) {
      throw new AppError('This phone number is already used by another account', 409);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName && { fullName }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(state !== undefined && { state: state || null }),
      ...(district !== undefined && { district: district || null }),
      ...(preferredLanguage && { preferredLanguage }),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      profilePhoto: true,
      state: true,
      district: true,
      preferredLanguage: true,
      isEmailVerified: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * Update profile photo
 */
export const updateProfilePhoto = async (userId: string, filePath: string) => {
  // Get current photo to delete it
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhoto: true },
  });

  // Delete old photo if exists
  if (user?.profilePhoto) {
    deleteFile(user.profilePhoto);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { profilePhoto: filePath },
    select: {
      id: true,
      fullName: true,
      profilePhoto: true,
    },
  });

  return updatedUser;
};

/**
 * Crop Service - Phase 2
 * Business logic for crop management
 */

import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CropStatus, GrowthStage } from '@prisma/client';

interface CreateCropInput {
  name: string;
  variety?: string;
  growthStage?: GrowthStage;
  plantingDate?: string;
  expectedHarvestDate?: string;
  expectedWaterReq?: number;
  currentStatus?: CropStatus;
  notes?: string;
}

// Validate field belongs to user
const validateFieldOwnership = async (fieldId: string, userId: string) => {
  const field = await prisma.field.findFirst({
    where: { id: fieldId, userId, deletedAt: null },
  });
  if (!field) throw new AppError('Field not found or access denied', 404);
  return field;
};

export const getCropsByField = async (fieldId: string, userId: string) => {
  await validateFieldOwnership(fieldId, userId);
  return prisma.crop.findMany({
    where: { fieldId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCropById = async (id: string, userId: string) => {
  const crop = await prisma.crop.findFirst({
    where: { id, deletedAt: null },
    include: { field: { select: { userId: true, name: true } } },
  });
  if (!crop) throw new AppError('Crop not found', 404);
  if (crop.field.userId !== userId) throw new AppError('Access denied', 403);
  return crop;
};

export const createCrop = async (fieldId: string, userId: string, data: CreateCropInput) => {
  await validateFieldOwnership(fieldId, userId);
  return prisma.crop.create({
    data: {
      fieldId,
      name: data.name,
      variety: data.variety,
      growthStage: data.growthStage ?? 'SEEDLING',
      plantingDate: data.plantingDate ? new Date(data.plantingDate) : undefined,
      expectedHarvestDate: data.expectedHarvestDate ? new Date(data.expectedHarvestDate) : undefined,
      expectedWaterReq: data.expectedWaterReq,
      currentStatus: data.currentStatus ?? 'GROWING',
      notes: data.notes,
    },
  });
};

export const updateCrop = async (id: string, userId: string, data: Partial<CreateCropInput> & { actualHarvestDate?: string }) => {
  const crop = await getCropById(id, userId);
  return prisma.crop.update({
    where: { id: crop.id },
    data: {
      ...data,
      plantingDate: data.plantingDate ? new Date(data.plantingDate) : undefined,
      expectedHarvestDate: data.expectedHarvestDate ? new Date(data.expectedHarvestDate) : undefined,
      actualHarvestDate: data.actualHarvestDate ? new Date(data.actualHarvestDate) : undefined,
    },
  });
};

export const deleteCrop = async (id: string, userId: string) => {
  await getCropById(id, userId);
  return prisma.crop.update({ where: { id }, data: { deletedAt: new Date() } });
};

export const getCropHistory = async (fieldId: string, userId: string) => {
  await validateFieldOwnership(fieldId, userId);
  return prisma.crop.findMany({
    where: { fieldId },
    orderBy: { createdAt: 'desc' },
  });
};

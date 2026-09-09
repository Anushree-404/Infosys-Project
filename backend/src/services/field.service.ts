/**
 * Field Service - Phase 2
 * Full CRUD with search, pagination, GPS, all new fields
 */

import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { FieldStatus, IrrigationMethod, WaterSource } from '@prisma/client';

interface CreateFieldInput {
  name: string;
  area: number;
  areaUnit?: string;
  state?: string;
  district?: string;
  village?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  soilType?: string;
  irrigationMethod?: IrrigationMethod;
  waterSource?: WaterSource;
  description?: string;
}

export const getFields = async (
  userId: string,
  options: { page?: number; limit?: number; search?: string; status?: FieldStatus } = {}
) => {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where = {
    userId,
    deletedAt: null,
    ...(options.status ? { status: options.status } : {}),
    ...(options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as const } },
            { state: { contains: options.search, mode: 'insensitive' as const } },
            { district: { contains: options.search, mode: 'insensitive' as const } },
            { village: { contains: options.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [fields, total] = await Promise.all([
    prisma.field.findMany({
      where,
      include: {
        _count: {
          select: {
            sensors: { where: { deletedAt: null } },
            crops: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.field.count({ where }),
  ]);

  return { fields, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

export const getFieldById = async (id: string, userId: string) => {
  const field = await prisma.field.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      sensors: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      crops: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      _count: {
        select: {
          sensors: { where: { deletedAt: null } },
          crops: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!field) throw new AppError('Field not found', 404);
  return field;
};

export const createField = async (userId: string, data: CreateFieldInput) => {
  // Validate GPS if provided
  if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
    throw new AppError('Invalid latitude. Must be between -90 and 90.', 400);
  }
  if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) {
    throw new AppError('Invalid longitude. Must be between -180 and 180.', 400);
  }
  if (data.area <= 0) throw new AppError('Area must be greater than 0', 400);

  return prisma.field.create({ data: { ...data, userId } });
};

export const updateField = async (id: string, userId: string, data: Partial<CreateFieldInput> & { status?: FieldStatus }) => {
  const field = await prisma.field.findFirst({ where: { id, userId, deletedAt: null } });
  if (!field) throw new AppError('Field not found', 404);

  if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
    throw new AppError('Invalid latitude', 400);
  }
  if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) {
    throw new AppError('Invalid longitude', 400);
  }

  return prisma.field.update({ where: { id }, data });
};

export const deleteField = async (id: string, userId: string) => {
  const field = await prisma.field.findFirst({ where: { id, userId, deletedAt: null } });
  if (!field) throw new AppError('Field not found', 404);
  return prisma.field.update({ where: { id }, data: { deletedAt: new Date() } });
};

/**
 * Sensor Service - Phase 2
 * Sensor CRUD + Data Ingestion + Validation
 */

import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { SensorStatus, SensorType } from '@prisma/client';
import { logger } from '../utils/logger';

interface CreateSensorInput {
  name: string;
  serialNumber: string;
  type: SensorType;
  location?: string;
  batteryLevel?: number;
  installationDate?: string;
}

interface SensorReadingInput {
  soilMoisture?: number;
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  waterLevel?: number;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  batteryLevel?: number;
  signalStrength?: number;
  timestamp?: string;
  source?: string;
}

// ============================================================
// VALIDATION
// ============================================================

const validateReading = (data: SensorReadingInput): { isValid: boolean; reason?: string } => {
  if (data.soilMoisture !== undefined && (data.soilMoisture < 0 || data.soilMoisture > 100)) {
    return { isValid: false, reason: 'Soil moisture out of range (0-100%)' };
  }
  if (data.temperature !== undefined && (data.temperature < -50 || data.temperature > 80)) {
    return { isValid: false, reason: 'Temperature out of range (-50 to 80°C)' };
  }
  if (data.humidity !== undefined && (data.humidity < 0 || data.humidity > 100)) {
    return { isValid: false, reason: 'Humidity out of range (0-100%)' };
  }
  if (data.rainfall !== undefined && data.rainfall < 0) {
    return { isValid: false, reason: 'Rainfall cannot be negative' };
  }
  if (data.ph !== undefined && (data.ph < 0 || data.ph > 14)) {
    return { isValid: false, reason: 'pH out of range (0-14)' };
  }
  if (data.batteryLevel !== undefined && (data.batteryLevel < 0 || data.batteryLevel > 100)) {
    return { isValid: false, reason: 'Battery level out of range (0-100%)' };
  }
  return { isValid: true };
};

// Check for duplicate reading within 5 seconds
const isDuplicate = async (sensorId: string, timestamp: Date): Promise<boolean> => {
  const window = new Date(timestamp.getTime() - 5000);
  const existing = await prisma.sensorReading.findFirst({
    where: { sensorId, timestamp: { gte: window } },
  });
  return !!existing;
};

// ============================================================
// SENSOR CRUD
// ============================================================

const validateFieldOwnership = async (fieldId: string, userId: string) => {
  const field = await prisma.field.findFirst({ where: { id: fieldId, userId, deletedAt: null } });
  if (!field) throw new AppError('Field not found or access denied', 404);
  return field;
};

export const getSensors = async (userId: string, fieldId?: string) => {
  const whereClause = fieldId
    ? { fieldId, field: { userId, deletedAt: null }, deletedAt: null }
    : { field: { userId, deletedAt: null }, deletedAt: null };

  return prisma.sensor.findMany({
    where: whereClause,
    include: {
      field: { select: { id: true, name: true } },
      _count: { select: { readings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getSensorById = async (id: string, userId: string) => {
  const sensor = await prisma.sensor.findFirst({
    where: { id, deletedAt: null },
    include: {
      field: { select: { userId: true, name: true, id: true } },
      readings: {
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
    },
  });
  if (!sensor) throw new AppError('Sensor not found', 404);
  if (sensor.field.userId !== userId) throw new AppError('Access denied', 403);
  return sensor;
};

export const createSensor = async (fieldId: string, userId: string, data: CreateSensorInput) => {
  await validateFieldOwnership(fieldId, userId);

  // Check duplicate serial number
  const existing = await prisma.sensor.findUnique({ where: { serialNumber: data.serialNumber } });
  if (existing) throw new AppError('Sensor with this serial number already exists', 409);

  return prisma.sensor.create({
    data: {
      fieldId,
      name: data.name,
      serialNumber: data.serialNumber,
      type: data.type,
      location: data.location,
      batteryLevel: data.batteryLevel,
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
    },
  });
};

export const updateSensor = async (id: string, userId: string, data: Partial<CreateSensorInput> & { status?: SensorStatus }) => {
  const sensor = await getSensorById(id, userId);
  return prisma.sensor.update({
    where: { id: sensor.id },
    data: {
      ...data,
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
    },
  });
};

export const deleteSensor = async (id: string, userId: string) => {
  await getSensorById(id, userId);
  return prisma.sensor.update({ where: { id }, data: { deletedAt: new Date() } });
};

// ============================================================
// SENSOR DATA INGESTION
// ============================================================

export const ingestReading = async (sensorId: string, data: SensorReadingInput, userId?: string) => {
  // Verify sensor exists and user has access
  const sensor = await prisma.sensor.findFirst({
    where: { id: sensorId, deletedAt: null },
    include: { field: { select: { userId: true } } },
  });
  if (!sensor) throw new AppError('Sensor not found', 404);
  if (userId && sensor.field.userId !== userId) throw new AppError('Access denied', 403);

  const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

  // Check for duplicate
  const dup = await isDuplicate(sensorId, timestamp);
  if (dup) {
    logger.warn(`Duplicate reading skipped for sensor ${sensorId}`);
    return null;
  }

  // Validate data
  const validation = validateReading(data);

  const reading = await prisma.sensorReading.create({
    data: {
      sensorId,
      soilMoisture: data.soilMoisture,
      temperature: data.temperature,
      humidity: data.humidity,
      rainfall: data.rainfall,
      waterLevel: data.waterLevel,
      ph: data.ph,
      nitrogen: data.nitrogen,
      phosphorus: data.phosphorus,
      potassium: data.potassium,
      batteryLevel: data.batteryLevel,
      signalStrength: data.signalStrength,
      isValid: validation.isValid,
      invalidReason: validation.reason,
      source: data.source ?? 'REST',
      timestamp,
    },
  });

  // Update sensor lastReading and battery
  await prisma.sensor.update({
    where: { id: sensorId },
    data: {
      lastReading: timestamp,
      batteryLevel: data.batteryLevel ?? sensor.batteryLevel,
      // Auto-mark as faulty if invalid readings pile up
    },
  });

  return reading;
};

export const getSensorReadings = async (
  sensorId: string,
  userId: string,
  options: { page?: number; limit?: number; from?: string; to?: string }
) => {
  await getSensorById(sensorId, userId);

  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where = {
    sensorId,
    ...(options.from || options.to
      ? {
          timestamp: {
            ...(options.from ? { gte: new Date(options.from) } : {}),
            ...(options.to ? { lte: new Date(options.to) } : {}),
          },
        }
      : {}),
  };

  const [readings, total] = await Promise.all([
    prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sensorReading.count({ where }),
  ]);

  return {
    readings,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const getLatestFieldData = async (fieldId: string, userId: string) => {
  await validateFieldOwnership(fieldId, userId);

  const sensors = await prisma.sensor.findMany({
    where: { fieldId, deletedAt: null, status: 'ACTIVE' },
    include: {
      readings: {
        where: { isValid: true },
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
  });

  return sensors.map((s) => ({
    sensorId: s.id,
    sensorName: s.name,
    type: s.type,
    status: s.status,
    batteryLevel: s.batteryLevel,
    lastReading: s.lastReading,
    latestData: s.readings[0] ?? null,
  }));
};

export const ingestTestData = async (fieldId: string, userId: string) => {
  await validateFieldOwnership(fieldId, userId);

  const sensors = await prisma.sensor.findMany({
    where: { fieldId, deletedAt: null, status: 'ACTIVE' },
  });

  if (!sensors.length) throw new AppError('No active sensors in this field', 400);

  const results = [];
  for (const sensor of sensors) {
    const mockData: SensorReadingInput = {
      soilMoisture: Math.round(Math.random() * 60 + 20),
      temperature: Math.round((Math.random() * 20 + 20) * 10) / 10,
      humidity: Math.round(Math.random() * 50 + 40),
      rainfall: Math.round(Math.random() * 5 * 10) / 10,
      batteryLevel: Math.round(Math.random() * 30 + 60),
      signalStrength: Math.round(Math.random() * 40 - 80),
      source: 'TEST',
    };
    const reading = await ingestReading(sensor.id, mockData);
    results.push({ sensorId: sensor.id, sensorName: sensor.name, reading });
  }
  return results;
};

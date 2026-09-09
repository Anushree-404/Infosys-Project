/**
 * Background Job Scheduler - Phase 2
 * Cron jobs: weather refresh, cache cleanup, sensor health, alerts
 */

import cron from 'node-cron';
import { logger } from '../utils/logger';
import { refreshAllFieldWeather } from '../services/weather.service';
import { createSensorOfflineAlert, createLowBatteryAlert, createLowMoistureAlert } from '../services/notification.service';
import prisma from '../config/database';

export const startScheduler = (): void => {
  logger.info('Background scheduler starting...');

  // ── Refresh weather every 30 minutes ───────────────────────
  cron.schedule('*/30 * * * *', async () => {
    logger.info('[CRON] Weather refresh triggered');
    try {
      await refreshAllFieldWeather();
    } catch (err) {
      logger.error('[CRON] Weather refresh failed:', err instanceof Error ? err.message : err);
    }
  });

  // ── Clean expired weather cache every hour ──────────────────
  cron.schedule('0 * * * *', async () => {
    logger.info('[CRON] Cache cleanup triggered');
    try {
      const [wd, wc] = await Promise.all([
        prisma.weatherData.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        prisma.weatherCache.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      ]);
      logger.info(`[CRON] Cleaned ${wd.count} weather + ${wc.count} cache records`);
    } catch (err) {
      logger.error('[CRON] Cache cleanup failed:', err instanceof Error ? err.message : err);
    }
  });

  // ── Check offline sensors + alerts every 15 minutes ─────────
  cron.schedule('*/15 * * * *', async () => {
    try {
      const thresholdTime = new Date(Date.now() - 60 * 60 * 1000);

      // Find sensors that went offline
      const goingOffline = await prisma.sensor.findMany({
        where: { status: 'ACTIVE', lastReading: { lt: thresholdTime }, deletedAt: null },
        include: { field: { select: { name: true, userId: true } } },
      });

      for (const sensor of goingOffline) {
        // Mark as inactive
        await prisma.sensor.update({ where: { id: sensor.id }, data: { status: 'INACTIVE' } });
        // Create notification
        await createSensorOfflineAlert(sensor.field.userId, sensor.name, sensor.field.name);
      }

      if (goingOffline.length > 0) {
        logger.warn(`[CRON] ${goingOffline.length} sensors marked INACTIVE + alerts created`);
      }

      // Check low battery (< 20%)
      const lowBatterySensors = await prisma.sensor.findMany({
        where: { status: 'ACTIVE', batteryLevel: { lt: 20, not: null }, deletedAt: null },
        include: { field: { select: { userId: true } } },
      });
      for (const sensor of lowBatterySensors) {
        await createLowBatteryAlert(sensor.field.userId, sensor.name, sensor.batteryLevel!);
      }

      // Check low soil moisture from latest readings (< 20%)
      const dryFields = await prisma.sensorReading.findMany({
        where: {
          soilMoisture: { lt: 20, not: null },
          isValid: true,
          timestamp: { gt: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
          sensor: { type: 'SOIL_MOISTURE', deletedAt: null },
        },
        include: {
          sensor: { include: { field: { select: { name: true, userId: true } } } },
        },
        distinct: ['sensorId'],
      });
      for (const reading of dryFields) {
        await createLowMoistureAlert(
          reading.sensor.field.userId,
          reading.sensor.field.name,
          reading.soilMoisture!
        );
      }

    } catch (err) {
      logger.error('[CRON] Sensor health check failed:', err instanceof Error ? err.message : err);
    }
  });

  // ── Clean old sensor readings (keep 90 days) ─────────────────
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CRON] Old sensor readings cleanup triggered');
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const deleted = await prisma.sensorReading.deleteMany({ where: { timestamp: { lt: cutoff } } });
      logger.info(`[CRON] Deleted ${deleted.count} old sensor readings`);
    } catch (err) {
      logger.error('[CRON] Sensor readings cleanup failed:', err instanceof Error ? err.message : err);
    }
  });

  logger.info('Background scheduler started ✅');
};

/**
 * Dashboard Service - Phase 2
 * Aggregates stats, weather, sensors, crops for the farmer dashboard
 */

import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import axios from 'axios';
import { logger } from '../utils/logger';

export const getDashboardData = async (userId: string) => {
  const [user, fieldCount, sensorCount, activeCrops, recentFields, sensorHealth, latestReadings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, profilePhoto: true, state: true, district: true, preferredLanguage: true },
    }),
    prisma.field.count({ where: { userId, deletedAt: null } }),
    prisma.sensor.count({ where: { field: { userId, deletedAt: null }, deletedAt: null } }),
    prisma.crop.count({ where: { field: { userId, deletedAt: null }, deletedAt: null, currentStatus: { in: ['GROWING', 'PLANNED'] } } }),
    prisma.field.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true, name: true, status: true, updatedAt: true, state: true, district: true,
        _count: { select: { sensors: { where: { deletedAt: null } }, crops: { where: { deletedAt: null } } } },
      },
    }),
    // Sensor health breakdown
    prisma.sensor.groupBy({
      by: ['status'],
      where: { field: { userId, deletedAt: null }, deletedAt: null },
      _count: { status: true },
    }),
    // Latest sensor readings (last 5 across all sensors)
    prisma.sensorReading.findMany({
      where: { sensor: { field: { userId }, deletedAt: null }, isValid: true },
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { sensor: { select: { name: true, type: true, field: { select: { name: true } } } } },
    }),
  ]);

  if (!user) throw new AppError('User not found', 404);

  // Weather from user location (cache-backed)
  let weather = null;
  if (user.district || user.state) {
    weather = await getWeatherData(userId, user.district || user.state || 'New Delhi');
  }

  // Sensor health map
  const sensorHealthMap: Record<string, number> = {};
  for (const g of sensorHealth) {
    sensorHealthMap[g.status] = g._count.status;
  }

  return {
    user,
    stats: {
      totalFields: fieldCount,
      totalSensors: sensorCount,
      activeCrops,
      sensorHealth: sensorHealthMap,
    },
    recentActivity: recentFields.map((f) => ({
      id: f.id,
      type: 'FIELD',
      name: f.name,
      description: `${f._count.crops} crops · ${f._count.sensors} sensors`,
      status: f.status,
      location: [f.district, f.state].filter(Boolean).join(', '),
      timestamp: f.updatedAt,
    })),
    latestReadings: latestReadings.map((r) => ({
      id: r.id,
      sensorName: r.sensor.name,
      sensorType: r.sensor.type,
      fieldName: r.sensor.field.name,
      soilMoisture: r.soilMoisture,
      temperature: r.temperature,
      humidity: r.humidity,
      rainfall: r.rainfall,
      batteryLevel: r.batteryLevel,
      timestamp: r.timestamp,
    })),
    weather,
    quickActions: [
      { label: 'Register New Field', href: '/dashboard/fields', icon: 'field' },
      { label: 'Add Sensor', href: '/dashboard/sensors', icon: 'sensor' },
      { label: 'View Weather', href: '/dashboard/weather', icon: 'weather' },
      { label: 'Manage Crops', href: '/dashboard/crops', icon: 'crop' },
    ],
  };
};

const getWeatherData = async (userId: string, location: string) => {
  try {
    const cached = await prisma.weatherCache.findFirst({
      where: { userId, location, expiresAt: { gt: new Date() } },
      orderBy: { fetchedAt: 'desc' },
    });
    if (cached) return cached.weatherData;

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_openweather_api_key') return null;

    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: `${location},IN`, appid: apiKey, units: 'metric' },
      timeout: 5000,
    });

    const weatherData = {
      temperature: Math.round(response.data.main.temp),
      feelsLike: Math.round(response.data.main.feels_like),
      humidity: response.data.main.humidity,
      description: response.data.weather[0]?.description || '',
      icon: response.data.weather[0]?.icon || '',
      windSpeed: response.data.wind?.speed || 0,
      location: response.data.name,
      country: response.data.sys?.country || 'IN',
    };

    await prisma.weatherCache.create({
      data: { userId, location, weatherData, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    return weatherData;
  } catch (error) {
    logger.warn('Weather fetch failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

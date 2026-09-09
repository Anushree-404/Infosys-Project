/**
 * ML Controller - Phase 3
 * Irrigation prediction, time-series, crop recommendations, irrigation schedule
 */

import { Request, Response, NextFunction } from 'express';
import {
  predictIrrigation, predictTimeSeries, getCropRecommendation,
  getIrrigationSchedule, checkMLServiceHealth, getModelInfo,
} from '../services/ml.service';
import { getFieldById } from '../services/field.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import prisma from '../config/database';

// ── Helper: get latest sensor readings for a field ────────────
const getLatestReadings = async (fieldId: string) => {
  return prisma.sensorReading.findMany({
    where: {
      sensor: { fieldId, deletedAt: null },
      isValid: true,
      timestamp: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['sensorId'],
    include: { sensor: { select: { type: true } } },
  });
};

const aggregateReadings = (readings: Awaited<ReturnType<typeof getLatestReadings>>) => {
  const agg: Record<string, number> = {};
  for (const r of readings) {
    if (r.soilMoisture != null)   agg.soil_moisture_pct = r.soilMoisture;
    if (r.temperature != null)    agg.temperature_c     = r.temperature;
    if (r.humidity != null)       agg.humidity_pct      = r.humidity;
    if (r.rainfall != null)       agg.rainfall_mm       = r.rainfall;
  }
  return agg;
};

// ── POST /api/ml/predict/:fieldId ─────────────────────────────
export const predictForField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user!.id;
    const field = await getFieldById(fieldId, userId);

    // 1. Try sensor readings (last 2 hours)
    const latestReadings = await getLatestReadings(fieldId);
    const agg = aggregateReadings(latestReadings);

    // 2. Get weather data as fallback/supplement
    let wxTemp = 28, wxHumidity = 65, wxRainfall = 0, wxWind = 10;
    let dataSource = 'Default values (no sensors or weather)';

    try {
      const wx = await prisma.weatherData.findFirst({
        where: { fieldId, expiresAt: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        orderBy: { fetchedAt: 'desc' },
      });
      if (wx) {
        wxTemp     = wx.temperature  ?? 28;
        wxHumidity = wx.humidity     ?? 65;
        wxRainfall = wx.rainfall1h   ?? 0;
        wxWind     = (wx.windSpeed   ?? 3) * 3.6; // m/s → km/h
        dataSource = `Weather API (${wx.location}) + ${latestReadings.length > 0 ? 'sensor readings' : 'weather fallback'}`;
      }
    } catch { /* ignore */ }

    if (latestReadings.length > 0) {
      dataSource = `Sensor readings (${latestReadings.length} active sensors)`;
    }

    // 3. Build input — sensors take priority, weather fills gaps
    // Normalize soil_type to valid enum values
    const normalizeSoilType = (s?: string | null): string => {
      if (!s) return 'Loamy';
      const t = s.trim().toLowerCase();
      if (t.includes('sandy') || t.includes('sand'))   return 'Sandy';
      if (t.includes('clay'))                           return 'Clay';
      if (t.includes('silt'))                           return 'Silt';
      if (t.includes('peat'))                           return 'Peaty';
      if (t.includes('chalk'))                          return 'Chalky';
      return 'Loamy'; // default
    };

    // Normalize region (state name → North/South/East/West/Central)
    const normalizeRegion = (s?: string | null): string => {
      if (!s) return 'South';
      const t = s.trim().toLowerCase();
      const south = ['karnataka','tamil','kerala','andhra','telangana','goa'];
      const north = ['punjab','haryana','himachal','uttarakhand','jammu','delhi','uttar pradesh','rajasthan'];
      const east  = ['west bengal','odisha','bihar','jharkhand','assam'];
      const west  = ['gujarat','maharashtra'];
      if (south.some(r => t.includes(r))) return 'South';
      if (north.some(r => t.includes(r))) return 'North';
      if (east.some(r => t.includes(r)))  return 'East';
      if (west.some(r => t.includes(r)))  return 'West';
      return 'Central';
    };

    // Normalize irrigation method to title case
    const normalizeIrrigMethod = (m?: string | null): string => {
      if (!m) return 'Drip';
      const t = m.trim().toLowerCase();
      if (t.includes('drip'))       return 'Drip';
      if (t.includes('sprinkler'))  return 'Sprinkler';
      if (t.includes('flood'))      return 'Flood';
      if (t.includes('furrow'))     return 'Furrow';
      return 'Drip';
    };

    const input = {
      soil_moisture_pct:  (agg.soil_moisture_pct  != null ? agg.soil_moisture_pct  : 40),
      temperature_c:      (agg.temperature_c      != null ? agg.temperature_c      : wxTemp),
      humidity_pct:       (agg.humidity_pct       != null ? agg.humidity_pct       : wxHumidity),
      rainfall_mm:        (agg.rainfall_mm        != null ? agg.rainfall_mm        : wxRainfall),
      wind_speed_kmh:     wxWind,
      evapotranspiration: Number(req.body.evapotranspiration) || 5,
      soil_ph:            Number(req.body.soil_ph)    || 6.5,
      nitrogen_ppm:       Number(req.body.nitrogen_ppm) || 60,
      phosphorus_ppm:     Number(req.body.phosphorus_ppm) || 65,
      potassium_ppm:      Number(req.body.potassium_ppm)  || 100,
      soil_type:          normalizeSoilType(field.soilType),
      crop_type:          String(req.body.crop_type   ?? 'Rice'),
      season:             String(req.body.season       ?? 'Kharif'),
      region:             normalizeRegion(field.state),
      irrigation_method:  normalizeIrrigMethod(field.irrigationMethod),
      growth_stage:       String(req.body.growth_stage ?? 'Vegetative'),
      field_area_ha:      field.area              ?? 1.0,
    };

    const prediction = await predictIrrigation(input);
    if (!prediction) return sendError(res, 'ML service is not running. Start it with: python -m uvicorn main:app --port 8000', 503);

    sendSuccess(res, 'Irrigation prediction ready', {
      fieldId, fieldName: field.name, prediction,
      dataSource,
      inputUsed: {
        soil_moisture: input.soil_moisture_pct,
        temperature:   input.temperature_c,
        humidity:      input.humidity_pct,
        rainfall:      input.rainfall_mm,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

// ── POST /api/ml/predict/timeseries/:fieldId ──────────────────
export const predictTimeSeriesForField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user!.id;
    const field = await getFieldById(fieldId, userId);

    // Get last 8 readings (up to 48h history)
    const history = await prisma.sensorReading.findMany({
      where: {
        sensor: { fieldId, deletedAt: null },
        isValid: true,
        timestamp: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'asc' },
      take: 8,
    });

    if (history.length < 2) {
      // No sensor history — simulate declining trend from weather data
      const wx = await prisma.weatherData.findFirst({
        where: { fieldId, expiresAt: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        orderBy: { fetchedAt: 'desc' },
      });
      const baseTemp = wx?.temperature ?? 30;
      const baseHumidity = wx?.humidity ?? 65;
      const baseRain = wx?.rainfall1h ?? 0;
      const simulatedReadings = [42, 37, 32, 27].map((m, i) => ({
        soil_moisture: m,
        temperature:   baseTemp + i * 0.5,
        humidity:      baseHumidity - i * 2,
        rainfall:      i === 0 ? baseRain : 0,
      }));
      const prediction = await predictTimeSeries(simulatedReadings);
      if (!prediction) return sendError(res, 'ML service unavailable', 503);
      return sendSuccess(res, 'Time-series prediction ready', {
        fieldId, fieldName: field.name, prediction,
        readingsUsed: 4,
        dataSource: wx ? `Simulated trend from weather data (${wx.location})` : 'Simulated trend (no sensor data)',
        note: 'Based on typical moisture decline pattern using weather conditions',
        generatedAt: new Date().toISOString(),
      });
    }

    const readings = history.map(r => ({
      soil_moisture: r.soilMoisture ?? 45,
      temperature:   r.temperature  ?? 28,
      humidity:      r.humidity     ?? 60,
      rainfall:      r.rainfall     ?? 0,
    }));

    const prediction = await predictTimeSeries(readings);
    if (!prediction) return sendError(res, 'ML service unavailable', 503);

    sendSuccess(res, 'Time-series prediction ready', {
      fieldId, fieldName: field.name, prediction,
      readingsUsed: readings.length,
      dataSource: `${history.length} sensor readings (last 48h)`,
      timespan: `${Math.round((Date.now() - history[0].timestamp.getTime()) / 3600000)}h`,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

// ── POST /api/ml/recommend/crop ───────────────────────────────
export const cropRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user!.id;
    const field = await getFieldById(fieldId, userId);
    const readings = await getLatestReadings(fieldId);
    const agg = aggregateReadings(readings);

    const input = {
      crop_type:          String(req.body.crop_type    ?? 'Rice'),
      growth_stage:       String(req.body.growth_stage ?? 'Vegetative'),
      soil_type:          field.soilType               ?? 'Loamy',
      season:             String(req.body.season        ?? 'Kharif'),
      temperature:        (agg.temperature_c  != null ? agg.temperature_c  : (Number(req.body.temperature) || 30)),
      humidity:           (agg.humidity_pct   != null ? agg.humidity_pct   : (Number(req.body.humidity)    || 65)),
      rainfall:           (agg.rainfall_mm    != null ? agg.rainfall_mm    : (Number(req.body.rainfall)    || 2)),
      soil_moisture:      (agg.soil_moisture_pct != null ? agg.soil_moisture_pct : (Number(req.body.soil_moisture) || 40)),
      evapotranspiration: Number(req.body.evapotranspiration) || 5,
    };

    const recommendation = await getCropRecommendation(input);
    if (!recommendation) return sendError(res, 'ML service unavailable', 503);

    sendSuccess(res, 'Crop recommendation ready', {
      fieldId, fieldName: field.name, recommendation, generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

// ── POST /api/ml/recommend/schedule ──────────────────────────
export const irrigationSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user!.id;
    const field = await getFieldById(fieldId, userId);
    const readings = await getLatestReadings(fieldId);
    const agg = aggregateReadings(readings);

    const input = {
      field_name:    field.name,
      crop_type:     String(req.body.crop_type    ?? 'Rice'),
      growth_stage:  String(req.body.growth_stage ?? 'Vegetative'),
      soil_moisture: (agg.soil_moisture_pct != null ? agg.soil_moisture_pct : (Number(req.body.soil_moisture) || 40)),
      temperature:   (agg.temperature_c    != null ? agg.temperature_c    : (Number(req.body.temperature)   || 30)),
      rainfall_7day: Number(req.body.rainfall_7day) || 10,
      field_area_ha: field.area ?? 1.0,
    };

    const schedule = await getIrrigationSchedule(input);
    if (!schedule) return sendError(res, 'ML service unavailable', 503);

    sendSuccess(res, 'Irrigation schedule generated', {
      fieldId, fieldName: field.name, schedule, generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

// ── GET /api/ml/health ────────────────────────────────────────
export const mlHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthy = await checkMLServiceHealth();
    const info    = healthy ? await getModelInfo() : null;
    sendSuccess(res, healthy ? 'ML service is running' : 'ML service is offline', {
      status: healthy ? 'online' : 'offline',
      serviceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
      model: info,
    });
  } catch (err) { next(err); }
};

// ── POST /api/ml/kaggle/irrigation/:fieldId ───────────────────
export const predictKaggleIrrigation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user!.id;
    const field = await getFieldById(fieldId, userId);
    const readings = await getLatestReadings(fieldId);
    const agg = aggregateReadings(readings);

    // Get weather data for temperature, humidity, wind, and rainfall estimate
    let wxTemp = 28, wxHumidity = 65, wxWind = 10, wxRain1h = 0;
    let annualRainfallEstimate = 1252; // dataset mean as fallback
    try {
      const wx = await prisma.weatherData.findFirst({
        where: { fieldId, expiresAt: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        orderBy: { fetchedAt: 'desc' },
      });
      if (wx) {
        wxTemp     = wx.temperature  ?? 28;
        wxHumidity = wx.humidity     ?? 65;
        wxWind     = (wx.windSpeed   ?? 3) * 3.6;
        wxRain1h   = wx.rainfall1h   ?? 0;
        // Estimate annual rainfall from season + current rain rate
        // Monsoon season: extrapolate from current hourly rate; otherwise use regional defaults
        const season = String(req.body.season ?? 'Kharif').toLowerCase();
        if (wxRain1h > 0) {
          // If it's raining now, estimate a wetter year
          annualRainfallEstimate = Math.min(2400, wxRain1h * 24 * 60);
        } else if (season === 'kharif') {
          annualRainfallEstimate = 1100; // typical monsoon year
        } else if (season === 'rabi') {
          annualRainfallEstimate = 700;  // drier winter crop season
        } else {
          annualRainfallEstimate = 500;  // Zaid (summer) — driest
        }
      }
    } catch { /* use defaults */ }

    const soilMoisture = agg.soil_moisture_pct != null ? agg.soil_moisture_pct : 37;
    const temperature  = agg.temperature_c     != null ? agg.temperature_c     : wxTemp;
    const humidity     = agg.humidity_pct      != null ? agg.humidity_pct      : wxHumidity;

    const input = {
      soil_ph:                 Number(req.body.soil_ph) || 6.5,
      soil_moisture:           soilMoisture,
      organic_carbon:          Number(req.body.organic_carbon) || 0.95,
      electrical_conductivity: Number(req.body.electrical_conductivity) || 1.8,
      temperature_c:           temperature,
      humidity:                humidity,
      // Annual rainfall in mm (Kaggle dataset feature) — NOT hourly sensor reading
      annual_rainfall_mm:      annualRainfallEstimate,
      sunlight_hours:          Number(req.body.sunlight_hours) || 8,
      wind_speed_kmh:          wxWind || 10,
      field_area_hectare:      field.area ?? 7.6,
      // Previous irrigation in mm (realistic: 20-100mm per session)
      previous_irrigation_mm:  Number(req.body.previous_irrigation_mm) || 50,
      soil_type:               field.soilType                    ?? 'Loamy',
      crop_type:               String(req.body.crop_type         ?? 'Rice'),
      crop_growth_stage:       String(req.body.crop_growth_stage ?? 'Vegetative'),
      season:                  String(req.body.season            ?? 'Kharif'),
      irrigation_type:         field.irrigationMethod            ?? 'Drip',
      water_source:            field.waterSource                 ?? 'River',
      mulching_used:           String(req.body.mulching_used     ?? 'No'),
      region:                  field.state                       ?? 'South',
    };

    const { predictIrrigationKaggle } = await import('../services/ml.service');
    const prediction = await predictIrrigationKaggle(input);
    if (!prediction) return sendError(res, 'ML service unavailable', 503);

    sendSuccess(res, 'Kaggle irrigation prediction ready', {
      fieldId, fieldName: field.name, prediction,
      dataSource: 'irrigation_prediction.csv (10,000 real Kaggle records)',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

// ── POST /api/ml/kaggle/crop/:fieldId ─────────────────────────
export const recommendCropKaggle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.params;
    const userId = req.user!.id;
    const field = await getFieldById(fieldId, userId);
    const readings = await getLatestReadings(fieldId);
    const agg = aggregateReadings(readings);

    const input = {
      nitrogen:    Number(req.body.nitrogen)    || 90,
      phosphorus:  Number(req.body.phosphorus)  || 42,
      potassium:   Number(req.body.potassium)   || 43,
      temperature: (agg.temperature_c != null ? agg.temperature_c : (Number(req.body.temperature) || 28)),
      humidity:    (agg.humidity_pct  != null ? agg.humidity_pct  : (Number(req.body.humidity)    || 65)),
      ph:          Number(req.body.ph)           || 6.5,
      rainfall:    (agg.rainfall_mm   != null ? agg.rainfall_mm   : (Number(req.body.rainfall)    || 100)),
    };

    const { getCropRecommendationKaggle } = await import('../services/ml.service');
    const recommendation = await getCropRecommendationKaggle(input);
    if (!recommendation) return sendError(res, 'ML service unavailable', 503);

    sendSuccess(res, 'Crop recommendation ready', {
      fieldId, fieldName: field.name, recommendation,
      dataSource: 'Crop_recommendation.csv (2,200 real Kaggle records, 22 crops)',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

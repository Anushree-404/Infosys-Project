/**
 * ML Service - Phase 3
 * Connects IrriSmart backend to FastAPI ML service.
 * Gracefully returns null if ML service is unavailable.
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = 30000;  // 30 seconds - ML model can take time on first load

// ── Types ──────────────────────────────────────────────────────
export interface IrrigationInput {
  soil_moisture_pct: number; temperature_c: number; humidity_pct: number;
  rainfall_mm: number; wind_speed_kmh: number; evapotranspiration: number;
  soil_ph: number; nitrogen_ppm: number; phosphorus_ppm: number; potassium_ppm: number;
  soil_type: string; crop_type: string; season: string; region: string;
  irrigation_method: string; growth_stage: string;
  field_area_ha?: number;
}

export interface IrrigationPrediction {
  irrigation_needed: boolean; confidence: number; recommendation: string;
  urgency: 'URGENT' | 'SOON' | 'MONITOR' | 'OK';
  suggested_water_mm: number | null; key_factors: string[]; model_used: string;
}

export interface TSReading {
  soil_moisture: number; temperature: number; humidity: number; rainfall: number;
}

export interface TSPrediction {
  irrigation_needed: boolean; confidence: number; urgency: string;
  trend: string; moisture_trend: string; recommendation: string;
  readings_analysed: number; model_used: string;
}

export interface CropRecommendInput {
  crop_type: string; growth_stage: string; soil_type: string; season: string;
  temperature: number; humidity: number; rainfall: number;
  soil_moisture: number; evapotranspiration: number;
}

export interface CropRecommendation {
  crop_type: string; growth_stage: string; water_req_mm_day: number;
  stress_level: string; stress_description: string;
  irrigation_times: string[]; daily_schedule: string; tips: string[];
}

export interface IrrigationScheduleInput {
  field_name: string; crop_type: string; growth_stage: string;
  soil_moisture: number; temperature: number; rainfall_7day: number; field_area_ha: number;
}

export interface IrrigationSchedule {
  field_name: string; weekly_schedule: Array<{
    day: string; action: string; recommended_time: string; water_mm: number;
  }>;
  total_water_m3: number; cost_saving_pct: number; recommendation: string;
}

// ── API calls ──────────────────────────────────────────────────

export const predictIrrigation = async (input: IrrigationInput): Promise<IrrigationPrediction | null> => {
  try {
    const res = await axios.post(`${ML_URL}/api/predict/irrigation`, input, { timeout: TIMEOUT });
    return res.data as IrrigationPrediction;
  } catch (err: unknown) {
    const axErr = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
    const status  = axErr?.response?.status;
    const detail  = axErr?.response?.data;
    const msg     = axErr?.message;
    const code    = axErr?.code;
    logger.warn(`ML predict/irrigation failed: status=${status} code=${code} msg=${msg} detail=${JSON.stringify(detail)}`);
    return null;
  }
};

export const predictTimeSeries = async (readings: TSReading[], soilType = 1, cropType = 0): Promise<TSPrediction | null> => {
  try {
    const res = await axios.post<TSPrediction>(`${ML_URL}/api/timeseries/predict`, {
      readings, soil_type: soilType, crop_type: cropType,
    }, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    logger.warn('ML timeseries/predict failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const getCropRecommendation = async (input: CropRecommendInput): Promise<CropRecommendation | null> => {
  try {
    const res = await axios.post<CropRecommendation>(`${ML_URL}/api/recommend/crop-water`, input, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    logger.warn('ML recommend/crop-water failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const getIrrigationSchedule = async (input: IrrigationScheduleInput): Promise<IrrigationSchedule | null> => {
  try {
    const res = await axios.post<IrrigationSchedule>(`${ML_URL}/api/recommend/irrigation-schedule`, input, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    logger.warn('ML recommend/irrigation-schedule failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const getCropRecommendationKaggle = async (input: {
  nitrogen: number; phosphorus: number; potassium: number;
  temperature: number; humidity: number; ph: number; rainfall: number;
}) => {
  try {
    const res = await axios.post(`${ML_URL}/api/kaggle/predict/crop`, input, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    logger.warn('ML kaggle/predict/crop failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const predictIrrigationKaggle = async (input: Record<string, unknown>) => {
  try {
    const res = await axios.post(`${ML_URL}/api/kaggle/predict/irrigation`, input, { timeout: TIMEOUT });
    return res.data;
  } catch (err) {
    logger.warn('ML kaggle/predict/irrigation failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const checkMLServiceHealth = async (): Promise<boolean> => {
  try {
    const res = await axios.get(`${ML_URL}/api/predict/health`, { timeout: 3000 });
    return res.data?.status === 'healthy';
  } catch { return false; }
};

export const getModelInfo = async () => {
  try {
    const res = await axios.get(`${ML_URL}/api/predict/model/info`, { timeout: 5000 });
    return res.data;
  } catch { return null; }
};

/**
 * Weather API Service - Phase 2
 */

import api from './api';
import type { WeatherData, ApiResponse } from '@/types';

export const getFieldWeather = async (fieldId: string): Promise<WeatherData> => {
  const res = await api.get<ApiResponse<WeatherData>>(`/weather/current/${fieldId}`);
  return res.data.data!;
};

export const getFieldForecast = async (fieldId: string) => {
  const res = await api.get(`/weather/forecast/${fieldId}`);
  return res.data.data;
};

export const refreshFieldWeather = async (fieldId: string): Promise<WeatherData> => {
  const res = await api.post<ApiResponse<WeatherData>>(`/weather/refresh/${fieldId}`);
  return res.data.data!;
};

/**
 * Sensor API Service - Phase 2
 */

import api from './api';
import type { Sensor, SensorReading, ApiResponse, PaginationMeta } from '@/types';

export const getSensors = async (fieldId?: string): Promise<Sensor[]> => {
  const res = await api.get<ApiResponse<Sensor[]>>('/sensors', {
    params: fieldId ? { fieldId } : {},
  });
  return res.data.data!;
};

export const getSensorById = async (id: string): Promise<Sensor> => {
  const res = await api.get<ApiResponse<Sensor>>(`/sensors/${id}`);
  return res.data.data!;
};

export const createSensor = async (fieldId: string, data: Partial<Sensor>): Promise<Sensor> => {
  const res = await api.post<ApiResponse<Sensor>>(`/sensors/fields/${fieldId}`, data);
  return res.data.data!;
};

export const updateSensor = async (id: string, data: Partial<Sensor>): Promise<Sensor> => {
  const res = await api.put<ApiResponse<Sensor>>(`/sensors/${id}`, data);
  return res.data.data!;
};

export const deleteSensor = async (id: string): Promise<void> => {
  await api.delete(`/sensors/${id}`);
};

export const ingestReading = async (
  sensorId: string,
  data: Partial<SensorReading>
): Promise<SensorReading> => {
  const res = await api.post<ApiResponse<SensorReading>>(`/sensors/${sensorId}/data`, data);
  return res.data.data!;
};

export const getSensorReadings = async (
  sensorId: string,
  params?: { page?: number; limit?: number; from?: string; to?: string }
): Promise<{ readings: SensorReading[]; meta: PaginationMeta }> => {
  const res = await api.get(`/sensors/${sensorId}/data`, { params });
  return { readings: res.data.data, meta: res.data.meta };
};

export const getLatestFieldData = async (fieldId: string) => {
  const res = await api.get(`/sensors/fields/${fieldId}/latest`);
  return res.data.data;
};

export const ingestTestData = async (fieldId: string) => {
  const res = await api.post(`/sensors/fields/${fieldId}/test-data`);
  return res.data.data;
};

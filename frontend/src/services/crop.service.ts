/**
 * Crop API Service - Phase 2
 */

import api from './api';
import type { Crop, ApiResponse } from '@/types';

export const getCropsByField = async (fieldId: string): Promise<Crop[]> => {
  const res = await api.get<ApiResponse<Crop[]>>(`/fields/${fieldId}/crops`);
  return res.data.data!;
};

export const getCropHistory = async (fieldId: string): Promise<Crop[]> => {
  const res = await api.get<ApiResponse<Crop[]>>(`/fields/${fieldId}/crops/history`);
  return res.data.data!;
};

export const createCrop = async (fieldId: string, data: Partial<Crop>): Promise<Crop> => {
  const res = await api.post<ApiResponse<Crop>>(`/fields/${fieldId}/crops`, data);
  return res.data.data!;
};

export const updateCrop = async (id: string, data: Partial<Crop>): Promise<Crop> => {
  const res = await api.put<ApiResponse<Crop>>(`/crops/${id}`, data);
  return res.data.data!;
};

export const deleteCrop = async (id: string): Promise<void> => {
  await api.delete(`/crops/${id}`);
};

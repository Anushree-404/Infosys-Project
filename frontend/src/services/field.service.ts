/**
 * Field API Service - Phase 2
 */

import api from './api';
import type { Field, ApiResponse, PaginationMeta } from '@/types';

export interface GetFieldsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const getFields = async (params?: GetFieldsParams): Promise<{ data: Field[]; meta: PaginationMeta }> => {
  const res = await api.get<ApiResponse<Field[]>>('/fields', { params });
  return { data: res.data.data!, meta: res.data.meta! };
};

export const getFieldById = async (id: string): Promise<Field> => {
  const res = await api.get<ApiResponse<Field>>(`/fields/${id}`);
  return res.data.data!;
};

export const createField = async (data: Partial<Field>): Promise<Field> => {
  const res = await api.post<ApiResponse<Field>>('/fields', data);
  return res.data.data!;
};

export const updateField = async (id: string, data: Partial<Field>): Promise<Field> => {
  const res = await api.put<ApiResponse<Field>>(`/fields/${id}`, data);
  return res.data.data!;
};

export const deleteField = async (id: string): Promise<void> => {
  await api.delete(`/fields/${id}`);
};

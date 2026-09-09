/**
 * Field Controller - Phase 2
 */

import { Request, Response, NextFunction } from 'express';
import * as fieldService from '../services/field.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { FieldStatus } from '@prisma/client';

export const getFields = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await fieldService.getFields(req.user!.id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string | undefined,
      status: status as FieldStatus | undefined,
    });
    sendSuccess(res, 'Fields fetched successfully', result.fields, 200, result.meta);
  } catch (err) { next(err); }
};

export const getFieldById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const field = await fieldService.getFieldById(req.params.id, req.user!.id);
    sendSuccess(res, 'Field fetched successfully', field);
  } catch (err) { next(err); }
};

export const createField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const field = await fieldService.createField(req.user!.id, req.body);
    sendCreated(res, 'Field created successfully', field);
  } catch (err) { next(err); }
};

export const updateField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const field = await fieldService.updateField(req.params.id, req.user!.id, req.body);
    sendSuccess(res, 'Field updated successfully', field);
  } catch (err) { next(err); }
};

export const deleteField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await fieldService.deleteField(req.params.id, req.user!.id);
    sendSuccess(res, 'Field deleted successfully');
  } catch (err) { next(err); }
};

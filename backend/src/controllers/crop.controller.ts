/**
 * Crop Controller - Phase 2
 */

import { Request, Response, NextFunction } from 'express';
import * as cropService from '../services/crop.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';

export const getCropsByField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const crops = await cropService.getCropsByField(req.params.fieldId, req.user!.id);
    sendSuccess(res, 'Crops fetched successfully', crops);
  } catch (err) { next(err); }
};

export const getCropById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const crop = await cropService.getCropById(req.params.id, req.user!.id);
    sendSuccess(res, 'Crop fetched successfully', crop);
  } catch (err) { next(err); }
};

export const createCrop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const crop = await cropService.createCrop(req.params.fieldId, req.user!.id, req.body);
    sendCreated(res, 'Crop created successfully', crop);
  } catch (err) { next(err); }
};

export const updateCrop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const crop = await cropService.updateCrop(req.params.id, req.user!.id, req.body);
    sendSuccess(res, 'Crop updated successfully', crop);
  } catch (err) { next(err); }
};

export const deleteCrop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cropService.deleteCrop(req.params.id, req.user!.id);
    sendSuccess(res, 'Crop deleted successfully');
  } catch (err) { next(err); }
};

export const getCropHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await cropService.getCropHistory(req.params.fieldId, req.user!.id);
    sendSuccess(res, 'Crop history fetched successfully', history);
  } catch (err) { next(err); }
};

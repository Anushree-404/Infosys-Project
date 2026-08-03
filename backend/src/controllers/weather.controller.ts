/**
 * Weather Controller - Phase 2
 */

import { Request, Response, NextFunction } from 'express';
import * as weatherService from '../services/weather.service';
import { sendSuccess } from '../utils/apiResponse';

export const getCurrentWeather = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await weatherService.getFieldWeather(req.params.fieldId, req.user!.id);
    sendSuccess(res, 'Weather data fetched successfully', data);
  } catch (err) { next(err); }
};

export const getForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await weatherService.getFieldForecast(req.params.fieldId, req.user!.id);
    sendSuccess(res, 'Forecast fetched successfully', data);
  } catch (err) { next(err); }
};

export const refreshWeather = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await weatherService.refreshFieldWeather(req.params.fieldId, req.user!.id);
    sendSuccess(res, 'Weather refreshed successfully', data);
  } catch (err) { next(err); }
};

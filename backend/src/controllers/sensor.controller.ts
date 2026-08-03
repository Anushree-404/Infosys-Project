/**
 * Sensor Controller - Phase 2
 */

import { Request, Response, NextFunction } from 'express';
import * as sensorService from '../services/sensor.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';

export const getSensors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldId } = req.query;
    const sensors = await sensorService.getSensors(req.user!.id, fieldId as string | undefined);
    sendSuccess(res, 'Sensors fetched successfully', sensors);
  } catch (err) { next(err); }
};

export const getSensorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sensor = await sensorService.getSensorById(req.params.id, req.user!.id);
    sendSuccess(res, 'Sensor fetched successfully', sensor);
  } catch (err) { next(err); }
};

export const createSensor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sensor = await sensorService.createSensor(req.params.fieldId, req.user!.id, req.body);
    sendCreated(res, 'Sensor registered successfully', sensor);
  } catch (err) { next(err); }
};

export const updateSensor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sensor = await sensorService.updateSensor(req.params.id, req.user!.id, req.body);
    sendSuccess(res, 'Sensor updated successfully', sensor);
  } catch (err) { next(err); }
};

export const deleteSensor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sensorService.deleteSensor(req.params.id, req.user!.id);
    sendSuccess(res, 'Sensor deleted successfully');
  } catch (err) { next(err); }
};

export const ingestReading = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reading = await sensorService.ingestReading(req.params.sensorId, req.body, req.user?.id);
    if (!reading) {
      sendSuccess(res, 'Duplicate reading ignored');
      return;
    }
    sendCreated(res, 'Reading ingested successfully', reading);
  } catch (err) { next(err); }
};

export const getSensorReadings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, from, to } = req.query;
    const result = await sensorService.getSensorReadings(req.params.id, req.user!.id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    });
    sendSuccess(res, 'Sensor readings fetched', result.readings, 200, result.meta);
  } catch (err) { next(err); }
};

export const getLatestFieldData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await sensorService.getLatestFieldData(req.params.fieldId, req.user!.id);
    sendSuccess(res, 'Latest field data fetched', data);
  } catch (err) { next(err); }
};

export const ingestTestData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await sensorService.ingestTestData(req.params.fieldId, req.user!.id);
    sendCreated(res, 'Test data ingested successfully', results);
  } catch (err) { next(err); }
};

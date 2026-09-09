/**
 * ML Routes - Phase 3
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as mlController from '../controllers/ml.controller';

const router = Router();

// Public health check
router.get('/health', mlController.mlHealth);

// All prediction routes require auth
router.use(authenticate);

// Single-reading prediction
router.post('/predict/:fieldId', mlController.predictForField);

// Time-series prediction (last N readings)
router.post('/timeseries/:fieldId', mlController.predictTimeSeriesForField);

// Crop water requirement recommendation
router.post('/recommend/crop/:fieldId', mlController.cropRecommendation);

// 7-day irrigation schedule
router.post('/recommend/schedule/:fieldId', mlController.irrigationSchedule);

// Kaggle model predictions
router.post('/kaggle/irrigation/:fieldId', mlController.predictKaggleIrrigation);
router.post('/kaggle/crop/:fieldId', mlController.recommendCropKaggle);

export default router;

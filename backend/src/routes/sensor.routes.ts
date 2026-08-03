/**
 * Sensor Routes - Phase 2
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as sensorController from '../controllers/sensor.controller';

const router = Router();
router.use(authenticate);

// Field-scoped sensor registration + data
router.post('/fields/:fieldId', sensorController.createSensor);
router.get('/fields/:fieldId/latest', sensorController.getLatestFieldData);
router.post('/fields/:fieldId/test-data', sensorController.ingestTestData);

// Individual sensor CRUD
router.get('/', sensorController.getSensors);
router.get('/:id', sensorController.getSensorById);
router.put('/:id', sensorController.updateSensor);
router.delete('/:id', sensorController.deleteSensor);

// Sensor data ingestion & readings
router.post('/:sensorId/data', sensorController.ingestReading);
router.get('/:id/data', sensorController.getSensorReadings);

export default router;

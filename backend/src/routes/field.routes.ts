/**
 * Field Routes - Phase 2
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as fieldController from '../controllers/field.controller';
import * as cropController from '../controllers/crop.controller';

const router = Router();
router.use(authenticate);

// Field CRUD
router.get('/', fieldController.getFields);
router.post('/', fieldController.createField);
router.get('/:id', fieldController.getFieldById);
router.put('/:id', fieldController.updateField);
router.delete('/:id', fieldController.deleteField);

// Crops nested under field
router.get('/:fieldId/crops', cropController.getCropsByField);
router.post('/:fieldId/crops', cropController.createCrop);
router.get('/:fieldId/crops/history', cropController.getCropHistory);

export default router;

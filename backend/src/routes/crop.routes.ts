/**
 * Crop Routes - Phase 2
 * Individual crop operations (field-scoped ones are in field.routes.ts)
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as cropController from '../controllers/crop.controller';

const router = Router();
router.use(authenticate);

router.get('/:id', cropController.getCropById);
router.put('/:id', cropController.updateCrop);
router.delete('/:id', cropController.deleteCrop);

export default router;

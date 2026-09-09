/**
 * Profile Routes
 */

import { Router } from 'express';
import * as profileController from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateProfileValidator } from '../middleware/validators/profile.validator';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileValidator), profileController.updateProfile);
router.post('/photo', profileController.uploadPhoto);

export default router;

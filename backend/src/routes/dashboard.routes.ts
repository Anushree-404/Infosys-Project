/**
 * Dashboard Routes
 */

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', dashboardController.getDashboard);

export default router;

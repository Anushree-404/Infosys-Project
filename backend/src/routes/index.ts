/**
 * Main Router - Phase 2
 */
import { fixProductionDatabase } from '../controllers/db-fix.controller';
import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import dashboardRoutes from './dashboard.routes';
import fieldRoutes from './field.routes';
import cropRoutes from './crop.routes';
import sensorRoutes from './sensor.routes';
import weatherRoutes from './weather.routes';
import notificationRoutes from './notification.routes';
import mlRoutes from './ml.routes';
import feedbackRoutes from './feedback.routes';
import pushRoutes from './push.routes';
import reportRoutes from './report.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'IrriSmart API v2.0',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/fields', fieldRoutes);
router.use('/crops', cropRoutes);
router.use('/sensors', sensorRoutes);
router.use('/weather', weatherRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ml', mlRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/push', pushRoutes);
router.use('/reports', reportRoutes);

router.get('/fix-production-db', fixProductionDatabase);

export default router;

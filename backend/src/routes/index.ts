/**
 * Main Router - Phase 2
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import dashboardRoutes from './dashboard.routes';
import fieldRoutes from './field.routes';
import cropRoutes from './crop.routes';
import sensorRoutes from './sensor.routes';
import weatherRoutes from './weather.routes';
import notificationRoutes from './notification.routes';

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

export default router;

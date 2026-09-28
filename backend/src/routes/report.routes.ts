import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as reportController from '../controllers/report.controller';

const router = Router();
router.use(authenticate);

router.get('/field/:fieldId',              reportController.downloadReport);
router.get('/field/:fieldId/alert-config', reportController.getAlertConfig);
router.put('/field/:fieldId/alert-config', reportController.updateAlertConfig);

export default router;

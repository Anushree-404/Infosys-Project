import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as pushController from '../controllers/push.controller';

const router = Router();

router.get('/vapid-key', pushController.getVapidKey);   // public
router.use(authenticate);
router.post('/subscribe',   pushController.subscribe);
router.post('/unsubscribe', pushController.unsubscribe);
router.post('/test',        pushController.testPush);   // sends a test push + in-app notification

export default router;

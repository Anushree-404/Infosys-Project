import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as feedbackController from '../controllers/feedback.controller';

const router = Router();

router.use(authenticate);

router.post('/', feedbackController.createFeedback);

export default router;
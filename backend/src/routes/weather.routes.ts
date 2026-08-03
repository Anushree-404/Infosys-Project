import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as weatherController from '../controllers/weather.controller';

const router = Router();
router.use(authenticate);

router.get('/current/:fieldId', weatherController.getCurrentWeather);
router.get('/forecast/:fieldId', weatherController.getForecast);
router.post('/refresh/:fieldId', weatherController.refreshWeather);

export default router;

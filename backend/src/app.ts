/**
 * Express Application Setup
 * Configures middleware, routes, and security
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { logger } from './utils/logger';
import { startScheduler } from './jobs/scheduler';
import { mqttService } from './mqtt/mqttService';
import { startMqttSubscriber } from './mqtt/mqttSubscriber';

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet - sets various HTTP security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving uploaded images
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ============================================================
// BODY PARSING MIDDLEWARE
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================================
// LOGGING MIDDLEWARE
// ============================================================

// Morgan HTTP request logger
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
    skip: (_req, res) => {
      // Skip logging health checks in production
      return process.env.NODE_ENV === 'production' && res.statusCode < 400;
    },
  })
);

// ============================================================
// STATIC FILES
// ============================================================

// Serve uploaded profile photos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ============================================================
// RATE LIMITING
// ============================================================

app.use('/api', apiLimiter);

// ============================================================
// API DOCUMENTATION
// ============================================================

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Irrigation System API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

// Swagger spec as JSON
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api', routes);

// Root route
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: '🌱 AI Irrigation Management System API',
    version: '2.0.0',
    docs: '/api/docs',
    health: '/api/health',
  });
});

// ============================================================
// START BACKGROUND SERVICES
// ============================================================

startScheduler();
mqttService.connect();
startMqttSubscriber();

// ============================================================
// ERROR HANDLING (must be last)
// ============================================================

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;

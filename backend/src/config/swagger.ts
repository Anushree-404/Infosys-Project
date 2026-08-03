/**
 * Swagger / OpenAPI Documentation - Phase 2
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IrriSmart - AI Irrigation Management System API',
      version: '2.0.0',
      description: `
## AI-Based Irrigation Management System — Phase 2

Production-ready REST API for managing farms, fields, crops, sensors, weather and AI irrigation recommendations.

### Authentication
This API uses **JWT Bearer tokens**.
- Access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days** (httpOnly cookie)

### Key Features
- 🔐 JWT Authentication with auto-refresh
- 🌾 Field Management (GPS, soil, irrigation method)
- 🌱 Crop Lifecycle Tracking
- 📡 IoT Sensor Registry & Data Ingestion
- 🌤️ Weather API Integration (OpenWeatherMap)
- 📊 Live Dashboard with sensor readings
- 🔄 Background jobs (weather refresh, sensor health)
- 🔌 MQTT-ready architecture (stub mode)
      `,
      contact: { name: 'IrriSmart Support', email: 'support@irrismart.com' },
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}`, description: 'Development' },
      { url: 'https://api.irrismart.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
          description: 'Paste your JWT access token from /api/auth/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string', example: 'Rajesh Kumar' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['FARMER', 'ADMIN'] },
            state: { type: 'string', example: 'Telangana' },
            district: { type: 'string', example: 'Warangal' },
            preferredLanguage: { type: 'string', example: 'TELUGU' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Field: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'North Paddy Field' },
            area: { type: 'number', example: 5.5 },
            areaUnit: { type: 'string', example: 'acres' },
            state: { type: 'string', nullable: true },
            district: { type: 'string', nullable: true },
            village: { type: 'string', nullable: true },
            latitude: { type: 'number', nullable: true },
            longitude: { type: 'number', nullable: true },
            soilType: { type: 'string', nullable: true },
            irrigationMethod: { type: 'string', enum: ['DRIP','SPRINKLER','FLOOD','FURROW','SUBSURFACE','RAIN_FED'], nullable: true },
            waterSource: { type: 'string', enum: ['BOREWELL','CANAL','RIVER','POND','RAINWATER','MUNICIPALITY'], nullable: true },
            status: { type: 'string', enum: ['ACTIVE','INACTIVE','FALLOW'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Crop: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Rice' },
            variety: { type: 'string', nullable: true },
            growthStage: { type: 'string', enum: ['SEEDLING','VEGETATIVE','FLOWERING','FRUITING','MATURITY','HARVESTING'] },
            plantingDate: { type: 'string', format: 'date-time', nullable: true },
            expectedHarvestDate: { type: 'string', format: 'date-time', nullable: true },
            expectedWaterReq: { type: 'number', nullable: true },
            currentStatus: { type: 'string', enum: ['PLANNED','GROWING','HARVESTED','FAILED'] },
            fieldId: { type: 'string', format: 'uuid' },
          },
        },
        Sensor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Soil Moisture Sensor 1' },
            serialNumber: { type: 'string', example: 'SENS-001-SM' },
            type: { type: 'string', enum: ['SOIL_MOISTURE','TEMPERATURE','HUMIDITY','RAINFALL','FLOW_METER','PH_SENSOR','NPK_SENSOR','WATER_LEVEL'] },
            status: { type: 'string', enum: ['ACTIVE','INACTIVE','FAULTY','MAINTENANCE'] },
            batteryLevel: { type: 'number', nullable: true },
            lastReading: { type: 'string', format: 'date-time', nullable: true },
            fieldId: { type: 'string', format: 'uuid' },
          },
        },
        SensorReading: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sensorId: { type: 'string', format: 'uuid' },
            soilMoisture: { type: 'number', nullable: true, example: 65.5 },
            temperature: { type: 'number', nullable: true, example: 28.3 },
            humidity: { type: 'number', nullable: true, example: 72.1 },
            rainfall: { type: 'number', nullable: true, example: 0.5 },
            batteryLevel: { type: 'number', nullable: true },
            signalStrength: { type: 'number', nullable: true },
            isValid: { type: 'boolean' },
            source: { type: 'string', enum: ['REST','MQTT','TEST'] },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Register, login, refresh, logout, password reset' },
      { name: 'Profile', description: 'User profile management' },
      { name: 'Dashboard', description: 'Aggregated dashboard data' },
      { name: 'Fields', description: 'Farm field CRUD + search + pagination' },
      { name: 'Crops', description: 'Crop lifecycle management' },
      { name: 'Sensors', description: 'IoT sensor registry + data ingestion' },
      { name: 'Weather', description: 'OpenWeatherMap integration per field' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

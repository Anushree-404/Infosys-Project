/**
 * MQTT Subscriber - Phase 2
 * Handles incoming sensor data from MQTT broker.
 * Routes messages to the sensor ingestion service.
 */

import { mqttService, MqttMessage } from './mqttService';
import { ingestReading } from '../services/sensor.service';
import { logger } from '../utils/logger';

export const startMqttSubscriber = (): void => {
  // Topic pattern: irrigsmart/sensors/{sensorId}/data
  mqttService.subscribe('irrigsmart/sensors/+/data', async (message: MqttMessage) => {
    try {
      logger.info(`MQTT message received for sensor: ${message.sensorId}`);
      await ingestReading(message.sensorId, { ...message.payload, source: 'MQTT' });
    } catch (err) {
      logger.error('MQTT subscriber error:', err instanceof Error ? err.message : err);
    }
  });
};

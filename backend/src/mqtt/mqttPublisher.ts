/**
 * MQTT Publisher - Phase 2
 * Publishes irrigation commands and alerts to field devices.
 */

import { mqttService } from './mqttService';
import { logger } from '../utils/logger';

export const publishIrrigationCommand = (fieldId: string, command: 'START' | 'STOP', durationMinutes?: number): void => {
  const topic = `irrigsmart/fields/${fieldId}/irrigation/command`;
  const payload = { command, durationMinutes, timestamp: new Date().toISOString() };
  mqttService.publish(topic, payload);
  logger.info(`Published irrigation command: ${command} for field ${fieldId}`);
};

export const publishAlert = (sensorId: string, alertType: string, value: number): void => {
  const topic = `irrigsmart/sensors/${sensorId}/alerts`;
  const payload = { alertType, value, timestamp: new Date().toISOString() };
  mqttService.publish(topic, payload);
};

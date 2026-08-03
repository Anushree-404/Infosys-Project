/**
 * MQTT Service - Phase 2
 * Abstract service layer for MQTT integration.
 * Currently in STUB mode - ready for real broker connection in Phase 3.
 * Switch MQTT_ENABLED=true in .env to activate.
 */

import { logger } from '../utils/logger';

export interface MqttMessage {
  sensorId: string;
  payload: {
    soilMoisture?: number;
    temperature?: number;
    humidity?: number;
    rainfall?: number;
    waterLevel?: number;
    batteryLevel?: number;
    signalStrength?: number;
    timestamp?: string;
  };
}

export type MqttMessageHandler = (message: MqttMessage) => Promise<void>;

class MqttService {
  private isConnected = false;
  private handlers: MqttMessageHandler[] = [];

  /**
   * Connect to MQTT broker.
   * In Phase 3, replace stub with real mqtt.connect() call.
   */
  connect(): void {
    const enabled = process.env.MQTT_ENABLED === 'true';
    if (!enabled) {
      logger.info('MQTT Service: Running in STUB mode. Set MQTT_ENABLED=true to activate.');
      return;
    }

    // Phase 3: Uncomment and configure
    // const client = mqtt.connect(process.env.MQTT_BROKER_URL!, { ... });
    // client.on('connect', () => { this.isConnected = true; ... });
    // client.on('message', (topic, message) => { ... });
    logger.info('MQTT Service: STUB mode active. Real broker not connected.');
  }

  /**
   * Publish data to a topic.
   * Stub: logs the message.
   */
  publish(topic: string, payload: object): void {
    if (!this.isConnected) {
      logger.debug(`MQTT STUB publish → ${topic}: ${JSON.stringify(payload)}`);
      return;
    }
    // Phase 3: client.publish(topic, JSON.stringify(payload));
  }

  /**
   * Subscribe to a topic.
   * Stub: registers handler for when real broker connects.
   */
  subscribe(topic: string, handler: MqttMessageHandler): void {
    this.handlers.push(handler);
    logger.debug(`MQTT STUB subscribed to: ${topic}`);
    // Phase 3: client.subscribe(topic); + route to handler
  }

  /**
   * Simulate an incoming MQTT message (for testing).
   */
  async simulateMessage(message: MqttMessage): Promise<void> {
    for (const handler of this.handlers) {
      await handler(message);
    }
  }

  isEnabled(): boolean {
    return this.isConnected;
  }
}

export const mqttService = new MqttService();
export default mqttService;

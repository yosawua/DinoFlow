/**
 * MQTT Subscriber Service
 * Listens for telemetry topics from ESP32 nodes and simulator
 * Pattern: dinoflow/{site_id}/{zone_id}/{node_id}/telemetry
 */

const mqtt = require('mqtt');
const env = require('../config/env');
const store = require('../db/store');
const { validateTelemetry } = require('../engine/validation');
const DetectionEngine = require('../engine/detector');
const eventHub = require('../websocket/hub');

class MqttSubscriber {
  constructor() {
    this.client = null;
    this.detector = new DetectionEngine({ waterCostPerM3: env.waterCostPerM3 });
    this.isConnected = false;
  }

  init() {
    try {
      this.client = mqtt.connect(env.mqttBrokerUrl, {
        clientId: `${env.mqttClientId}-${Math.random().toString(16).slice(2, 6)}`,
        reconnectPeriod: 4000,
        connectTimeout: 5000
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`📡 MQTT Broker connected at ${env.mqttBrokerUrl}`);
        this.client.subscribe('dinoflow/+/+/+/telemetry', { qos: 0 }, (err) => {
          if (!err) {
            console.log('✅ Subscribed to topic: dinoflow/+/+/+/telemetry');
          }
        });
      });

      this.client.on('message', async (topic, message) => {
        let payload;
        try {
          payload = JSON.parse(message.toString());
        } catch (err) {
          console.warn('Invalid MQTT telemetry JSON:', err.message);
          return;
        }

        try {
          await this.processTelemetry(payload);
        } catch (err) {
          console.error('Failed to process MQTT telemetry:', err.message);
        }
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('MQTT client error:', err.message);
      });

      this.client.on('offline', () => {
        this.isConnected = false;
      });
    } catch (e) {
      console.warn(`⚠️ MQTT Client could not connect: ${e.message}`);
    }
  }

  async processTelemetry(rawPayload) {
    // 1. Validation
    const validation = validateTelemetry(rawPayload);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const reading = validation.data;

    // 2. Persist Reading
    await store.saveReading(reading);

    // 3. Update Node Status
    await store.createOrUpdateNode({
      id: reading.node_id,
      site_id: reading.site_id,
      zone_id: reading.zone_id,
      status: 'online'
    });

    // 4. Anomaly Detection
    const rules = await store.getRules();
    const newAlerts = this.detector.evaluate(reading, rules);

    for (const alert of newAlerts) {
      await store.saveAlert(alert);
      console.log(`🚨 [ALERT DETECTED] [${alert.severity.toUpperCase()}] ${alert.title}`);
      // Broadcast alert immediately to WebSockets
      eventHub.broadcast('alert', alert);
    }

    // 5. Broadcast Telemetry to connected frontend PWA clients
    eventHub.broadcast('telemetry', reading);

    return { success: true, reading, alertsGenerated: newAlerts.length };
  }
}

module.exports = new MqttSubscriber();

/**
 * DinoFlow IoT Sensor Node Firmware (ESP32)
 * Hardware:
 *   - Flow meter: YF-S201 (Hall-effect pulse interrupt on GPIO 4)
 *   - Pressure sensor: 0.5 - 4.5V ceramic core transducer (ADC GPIO 34 via 2:1 divider)
 *   - Temperature: DS18B20 1-Wire (GPIO 5 with 4.7k pullup)
 * Connectivity: WiFi + MQTT with offline ring buffer & dynamic calibration
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "config.h"

// ==========================================
// Globals & Peripherals
// ==========================================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

OneWire oneWire(PIN_ONEWIRE_TEMP);
DallasTemperature tempSensor(&oneWire);

// Flow Pulse Counter (Interrupt Service Routine)
volatile unsigned long pulseCounter = 0;
unsigned long lastPulseTime = 0;
portMUX_TYPE isrMux = portMUX_INITIALIZER_UNLOCKED;

void IRAM_ATTR onFlowPulse() {
  portENTER_CRITICAL_ISR(&isrMux);
  pulseCounter++;
  portEXIT_CRITICAL_ISR(&isrMux);
}

// Configurable Calibration Factors
float flowCalibrationFactor = DEFAULT_FLOW_CAL_FACTOR;
float pressureOffsetVoltage = DEFAULT_PRESSURE_OFFSET_V;
float pressureSlope = DEFAULT_PRESSURE_SLOPE;

// Offline Ring Buffer Structure
struct TelemetryRecord {
  unsigned long timestamp_sec;
  float flow_lpm;
  float pressure_bar;
  float temp_c;
};

TelemetryRecord offlineBuffer[OFFLINE_BUFFER_CAPACITY];
int bufferHead = 0;
int bufferTail = 0;
int bufferCount = 0;

void queueOfflineReading(float flow, float pressure, float temp) {
  offlineBuffer[bufferHead].timestamp_sec = millis() / 1000;
  offlineBuffer[bufferHead].flow_lpm = flow;
  offlineBuffer[bufferHead].pressure_bar = pressure;
  offlineBuffer[bufferHead].temp_c = temp;

  bufferHead = (bufferHead + 1) % OFFLINE_BUFFER_CAPACITY;
  if (bufferCount < OFFLINE_BUFFER_CAPACITY) {
    bufferCount++;
  } else {
    // Overwrite oldest record if buffer full
    bufferTail = (bufferTail + 1) % OFFLINE_BUFFER_CAPACITY;
  }
}

// ==========================================
// Sensor Acquisition Functions
// ==========================================

/**
 * Calculates flow in Liters/Minute based on pulse count
 */
float readFlowRate(unsigned long durationMs) {
  unsigned long pulses;
  portENTER_CRITICAL(&isrMux);
  pulses = pulseCounter;
  pulseCounter = 0;
  portEXIT_CRITICAL(&isrMux);

  if (durationMs == 0) return 0.0f;
  float frequencyHz = (pulses * 1000.0f) / durationMs;
  float flowLpm = frequencyHz / flowCalibrationFactor;
  return max(0.0f, flowLpm);
}

/**
 * Reads ceramic core pressure transducer (0.5V - 4.5V)
 * Uses 16-sample ADC averaging to eliminate high-frequency ripple
 */
float readPressureBar() {
  uint32_t adcSum = 0;
  for (int i = 0; i < 16; i++) {
    adcSum += analogRead(PIN_PRESSURE_ADC);
    delayMicroseconds(200);
  }
  float rawAdc = (float)adcSum / 16.0f;

  // ESP32 ADC: 0 - 4095 corresponds to 0 - 3.3V
  // Hardware voltage divider: Vin = V_adc * (R1 + R2) / R2 = V_adc * 1.5
  float pinVoltage = (rawAdc / 4095.0f) * 3.3f;
  float sensorVoltage = pinVoltage * 1.5f;

  if (sensorVoltage < (pressureOffsetVoltage - 0.2f)) {
    // Sensor disconnected or open circuit
    return 0.0f;
  }

  float pressureBar = (sensorVoltage - pressureOffsetVoltage) * pressureSlope;
  return max(0.0f, pressureBar);
}

/**
 * Reads digital temperature from DS18B20
 */
float readTemperatureC() {
  tempSensor.requestTemperatures();
  float temp = tempSensor.getTempCByIndex(0);
  if (temp == DEVICE_DISCONNECTED_C || temp < -40.0f) {
    return 21.0f; // Safe fallback reading
  }
  return temp;
}

// ==========================================
// Network & MQTT Handlers
// ==========================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to WiFi: ");
  Serial.println(DEFAULT_WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected! IP: " + WiFi.localIP().toString());
    digitalWrite(PIN_STATUS_LED, HIGH);
  } else {
    Serial.println("\n⚠️ WiFi Timeout. Storing readings in local ring buffer.");
    digitalWrite(PIN_STATUS_LED, LOW);
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  // Remote dynamic calibration command
  if (doc.containsKey("flow_cal")) {
    flowCalibrationFactor = doc["flow_cal"].as<float>();
    Serial.printf("Updated Flow Factor: %.2f\n", flowCalibrationFactor);
  }
  if (doc.containsKey("pressure_offset")) {
    pressureOffsetVoltage = doc["pressure_offset"].as<float>();
    Serial.printf("Updated Pressure Offset: %.2fV\n", pressureOffsetVoltage);
  }
}

void flushOfflineBuffer() {
  while (bufferCount > 0 && mqttClient.connected()) {
    TelemetryRecord rec = offlineBuffer[bufferTail];
    bufferTail = (bufferTail + 1) % OFFLINE_BUFFER_CAPACITY;
    bufferCount--;

    StaticJsonDocument<256> doc;
    doc["site_id"] = DINOFLOW_SITE_ID;
    doc["zone_id"] = DINOFLOW_ZONE_ID;
    doc["node_id"] = DINOFLOW_DEVICE_ID;
    doc["flow_lpm"] = rec.flow_lpm;
    doc["pressure_bar"] = rec.pressure_bar;
    doc["temperature_c"] = rec.temp_c;
    doc["buffered"] = true;

    char buffer[256];
    serializeJson(doc, buffer);
    mqttClient.publish(DEFAULT_MQTT_TOPIC, buffer);
  }
}

void reconnectMqtt() {
  if (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT Broker at ");
    Serial.println(DEFAULT_MQTT_HOST);

    String clientId = "DinoFlowNode-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("✅ MQTT Connected!");
      mqttClient.subscribe(DEFAULT_CMD_TOPIC);
      // Flush queued offline records
      flushOfflineBuffer();
    }
  }
}

// ==========================================
// Setup & Loop
// ==========================================

unsigned long lastTick = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n🦖 DinoFlow ESP32 Smart Pipe Node Initializing...");

  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_PRESSURE_ADC, INPUT);

  // Flow Sensor Hardware Interrupt
  pinMode(PIN_FLOW_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_SENSOR), onFlowPulse, RISING);

  // Initialize DS18B20 1-Wire
  tempSensor.begin();

  // Setup MQTT
  mqttClient.setServer(DEFAULT_MQTT_HOST, DEFAULT_MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  connectWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMqtt();
    }
    mqttClient.loop();
  } else {
    // Attempt non-blocking reconnect periodically
    if (millis() % 10000 < 50) {
      connectWiFi();
    }
  }

  // Periodic Telemetry Acquisition
  unsigned long now = millis();
  if (now - lastTick >= TELEMETRY_INTERVAL_MS) {
    unsigned long interval = now - lastTick;
    lastTick = now;

    float flow = readFlowRate(interval);
    float pressure = readPressureBar();
    float temp = readTemperatureC();

    Serial.printf("[Nodo] Flujo: %.2f L/min | Presión: %.2f bar | Temp: %.1f °C\n", flow, pressure, temp);

    if (mqttClient.connected()) {
      StaticJsonDocument<256> doc;
      doc["site_id"] = DINOFLOW_SITE_ID;
      doc["zone_id"] = DINOFLOW_ZONE_ID;
      doc["node_id"] = DINOFLOW_DEVICE_ID;
      doc["flow_lpm"] = round(flow * 100.0f) / 100.0f;
      doc["pressure_bar"] = round(pressure * 100.0f) / 100.0f;
      doc["temperature_c"] = round(temp * 10.0f) / 10.0f;
      doc["rssi"] = WiFi.RSSI();

      char buffer[256];
      serializeJson(doc, buffer);
      mqttClient.publish(DEFAULT_MQTT_TOPIC, buffer);
    } else {
      // Network down -> Store in local ring buffer
      queueOfflineReading(flow, pressure, temp);
      Serial.printf("📦 Network offline. Queued in local ring buffer (%d items)\n", bufferCount);
    }
  }
}

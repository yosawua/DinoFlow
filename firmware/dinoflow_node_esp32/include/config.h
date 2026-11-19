#ifndef DINOFLOW_CONFIG_H
#define DINOFLOW_CONFIG_H

#include <Arduino.h>

// ==========================================
// Device Identity & Network Settings
// ==========================================
#define DINOFLOW_DEVICE_ID   "node-esp32-01"
#define DINOFLOW_SITE_ID     "site-casa-01"
#define DINOFLOW_ZONE_ID     "zone-acometida"
#define DINOFLOW_FIRMWARE_VER "1.0.0"

// WiFi Credentials (overridable via Web Portal / NVS)
#define DEFAULT_WIFI_SSID    "DinoFlow_WiFi"
#define DEFAULT_WIFI_PASS    "dinoflow2026"

// MQTT Broker Settings
#define DEFAULT_MQTT_HOST    "192.168.1.100"
#define DEFAULT_MQTT_PORT    1883
#define DEFAULT_MQTT_TOPIC   "dinoflow/" DINOFLOW_SITE_ID "/" DINOFLOW_ZONE_ID "/" DINOFLOW_DEVICE_ID "/telemetry"
#define DEFAULT_CMD_TOPIC    "dinoflow/" DINOFLOW_DEVICE_ID "/config"

// ==========================================
// Hardware Pin Definitions (ESP32 DevKit V1)
// ==========================================
// 1. Flow Sensor (YF-S201 Hall-effect pulses on interrupt GPIO)
#define PIN_FLOW_SENSOR      4

// 2. Analog Pressure Transducer (0.5V to 4.5V via voltage divider to ADC1)
#define PIN_PRESSURE_ADC     34

// 3. Digital Temperature Sensor DS18B20 (Dallas 1-Wire with 4.7k pull-up)
#define PIN_ONEWIRE_TEMP     5

// Status LED (Onboard or external indicator)
#define PIN_STATUS_LED       2

// ==========================================
// Sensor Calibration Defaults
// ==========================================
// YF-S201: 7.5 pulses per second approximately equals 1 L/min
#define DEFAULT_FLOW_CAL_FACTOR 7.5f

// Pressure Transducer (0.5V = 0 bar, 4.5V = 12 bar, scaled with 2/3 divider for ESP32 3.3V ADC)
#define DEFAULT_PRESSURE_OFFSET_V 0.50f
#define DEFAULT_PRESSURE_SLOPE   3.00f // bar per volt

// Telemetry Reporting Intervals
#define TELEMETRY_INTERVAL_MS   2000
#define RETRY_BACKOFF_MIN_MS    1000
#define RETRY_BACKOFF_MAX_MS    30000

// Local Flash / RAM Ring Buffer Size (Stores offline readings when network drops)
#define OFFLINE_BUFFER_CAPACITY 200

#endif // DINOFLOW_CONFIG_H

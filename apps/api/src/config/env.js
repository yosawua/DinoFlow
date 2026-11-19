const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiHost: process.env.API_HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/dinoflow',
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  mqttClientId: process.env.MQTT_CLIENT_ID || 'dinoflow-backend',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM', // Rachel / default clear voice
  waterCostPerM3: parseFloat(process.env.WATER_COST_PER_M3 || '25.50'),
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'MXN',
  simulatorControlUrl: process.env.SIMULATOR_CONTROL_URL || 'http://localhost:3002'
};

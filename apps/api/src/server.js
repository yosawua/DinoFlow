/**
 * DinoFlow Central Backend & Telemetry Ingestion Server
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const store = require('./db/store');
const eventHub = require('./websocket/hub');
const mqttSubscriber = require('./mqtt/subscriber');

// Import Route Handlers
const telemetryRoutes = require('./routes/telemetry');
const sitesRoutes = require('./routes/sites');
const zonesRoutes = require('./routes/zones');
const nodesRoutes = require('./routes/nodes');
const alertsRoutes = require('./routes/alerts');
const rulesRoutes = require('./routes/rules');
const metricsRoutes = require('./routes/metrics');
const aiRoutes = require('./routes/ai');
const voiceRoutes = require('./routes/voice');
const simulatorRoutes = require('./routes/simulator');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'DinoFlow',
    version: '1.0.0',
    mode: 'Local-First',
    database: store.isUsingPostgres() ? 'PostgreSQL/TimescaleDB' : 'Resilient In-Memory Store',
    mqtt: mqttSubscriber.isConnected ? 'Connected' : 'Offline / Polling',
    timestamp: new Date().toISOString()
  });
});

// Server-Sent Events (SSE) fallback stream
app.get('/api/v1/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  eventHub.addSseClient(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
});

// Mount API routes
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/sites', sitesRoutes);
app.use('/api/v1/zones', zonesRoutes);
app.use('/api/v1/nodes', nodesRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/rules', rulesRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/voice', voiceRoutes);
app.use('/api/v1/simulator', simulatorRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Server Bootstrap
async function start() {
  console.log('🦖 Initializing DinoFlow Backend System...');

  // 1. Initialize Database
  await store.initDb();

  // 2. Initialize Real-Time WebSocket Hub
  eventHub.init(server);

  // 3. Initialize MQTT Subscriber
  mqttSubscriber.init();

  // 4. Start HTTP Server
  server.listen(env.port, env.apiHost, () => {
    console.log(`====================================================`);
    console.log(`🚀 DinoFlow API Server running at http://${env.apiHost}:${env.port}`);
    console.log(`⚡ WebSocket Stream available at ws://${env.apiHost}:${env.port}/ws`);
    console.log(`📡 SSE Stream available at http://${env.apiHost}:${env.port}/api/v1/events`);
    console.log(`🩺 Health check: http://${env.apiHost}:${env.port}/health`);
    console.log(`====================================================`);
  });
}

start();

module.exports = { app, server };

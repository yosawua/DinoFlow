const express = require('express');
const router = express.Router();
const store = require('../db/store');
const mqttSubscriber = require('../mqtt/subscriber');

// Fallback HTTP ingestion endpoint
router.post('/', async (req, res) => {
  try {
    const result = await mqttSubscriber.processTelemetry(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validación de telemetría fallida', details: result.errors });
    }
    return res.status(201).json({ status: 'ok', alerts_generated: result.alertsGenerated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Latest readings per node
router.get('/latest', async (req, res) => {
  try {
    const readings = await store.getLatestReadings();
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historical readings for charts
router.get('/history', async (req, res) => {
  try {
    const { zone_id, node_id, limit } = req.query;
    const history = await store.getReadingsHistory({
      zone_id,
      node_id,
      limit: limit ? parseInt(limit, 10) : 100
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

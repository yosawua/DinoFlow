const express = require('express');
const router = express.Router();
const store = require('../db/store');
const eventHub = require('../websocket/hub');

router.get('/', async (req, res) => {
  try {
    const { status, site_id, limit } = req.query;
    const alerts = await store.getAlerts({
      status,
      site_id,
      limit: limit ? parseInt(limit, 10) : 50
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update alert status ('vista', 'resuelta')
router.patch('/:id', async (req, res) => {
  try {
    const { status, resolved_by } = req.body;
    if (!['nueva', 'vista', 'resuelta'].includes(status)) {
      return res.status(400).json({ error: 'Estado debe ser nueva, vista o resuelta' });
    }

    const updated = await store.updateAlertStatus(req.params.id, status, resolved_by || 'tecnico');
    if (!updated) return res.status(404).json({ error: 'Alerta no encontrada' });

    eventHub.broadcast('alert_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

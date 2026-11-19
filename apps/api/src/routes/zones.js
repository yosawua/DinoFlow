const express = require('express');
const router = express.Router();
const store = require('../db/store');

router.get('/', async (req, res) => {
  try {
    const { site_id } = req.query;
    const zones = await store.getZones(site_id);
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { site_id, name, description, floor_level, is_critical } = req.body;
    if (!site_id || !name) {
      return res.status(400).json({ error: 'site_id y name son obligatorios' });
    }

    const newZone = {
      id: `zone-${Date.now()}`,
      site_id,
      name,
      description: description || '',
      floor_level: floor_level ? parseInt(floor_level, 10) : 0,
      is_critical: Boolean(is_critical)
    };

    const created = await store.createZone(newZone);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

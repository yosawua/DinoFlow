const express = require('express');
const router = express.Router();
const store = require('../db/store');

router.get('/', async (req, res) => {
  try {
    const rules = await store.getRules();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update rule thresholds dynamically without touching code
router.put('/:id', async (req, res) => {
  try {
    const { config, is_enabled } = req.body;
    const updated = await store.updateRuleConfig(req.params.id, config, is_enabled);
    if (!updated) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

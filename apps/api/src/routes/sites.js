const express = require('express');
const router = express.Router();
const store = require('../db/store');

router.get('/', async (req, res) => {
  try {
    const sites = await store.getSites();
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const site = await store.getSiteById(req.params.id);
    if (!site) return res.status(404).json({ error: 'Sitio no encontrado' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, address, site_type, cost_per_m3, currency } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre del sitio es obligatorio' });

    const newSite = {
      id: `site-${Date.now()}`,
      name,
      address: address || '',
      site_type: site_type || 'residencial',
      cost_per_m3: cost_per_m3 ? parseFloat(cost_per_m3) : 25.50,
      currency: currency || 'MXN',
      created_at: new Date().toISOString()
    };

    const created = await store.createSite(newSite);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

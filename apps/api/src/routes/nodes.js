const express = require('express');
const router = express.Router();
const store = require('../db/store');

router.get('/', async (req, res) => {
  try {
    const { site_id } = req.query;
    const nodes = await store.getNodes(site_id);
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const node = await store.getNodeById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Nodo no encontrado' });
    res.json(node);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Installer Onboarding: Pair new ESP32 Node via QR code / Device Code
router.post('/pair', async (req, res) => {
  try {
    const { node_id, site_id, zone_id, name, mac_address, connection_type } = req.body;
    if (!node_id || !site_id || !zone_id) {
      return res.status(400).json({ error: 'node_id, site_id y zone_id son obligatorios para emparejar' });
    }

    const pairedNode = await store.createOrUpdateNode({
      id: node_id,
      site_id,
      zone_id,
      name: name || `Nodo ${node_id}`,
      mac_address: mac_address || 'AA:BB:CC:DD:EE:FF',
      connection_type: connection_type || 'wifi',
      status: 'online',
      ip_address: req.ip || '192.168.1.150'
    });

    res.status(201).json({
      success: true,
      message: 'Nodo emparejado y registrado correctamente en la red hidráulica',
      node: pairedNode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

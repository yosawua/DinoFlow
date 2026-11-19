const express = require('express');
const router = express.Router();
const { calculateSummaryMetrics } = require('../services/metrics');

router.get('/summary', async (req, res) => {
  try {
    const { site_id } = req.query;
    const metrics = await calculateSummaryMetrics(site_id || 'site-casa-01');
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

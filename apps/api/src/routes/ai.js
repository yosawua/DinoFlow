const express = require('express');
const router = express.Router();
const gemini = require('../services/gemini');
const store = require('../db/store');
const { calculateSummaryMetrics } = require('../services/metrics');

// Natural language explanation of an alert
router.post('/explain-alert/:id', async (req, res) => {
  try {
    const alerts = await store.getAlerts();
    const alert = alerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });

    const explanation = await gemini.explainAlert(alert);

    // Save enriched explanation in alert record
    alert.ai_explanation = explanation.explanation;
    alert.ai_recommendations = JSON.stringify(explanation.recommended_actions);
    await store.saveAlert(alert);

    res.json(explanation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily executive consumption summary
router.post('/daily-report', async (req, res) => {
  try {
    const metrics = await calculateSummaryMetrics('site-casa-01');
    const alerts = await store.getAlerts();
    const activeAlerts = alerts.filter(a => a.status !== 'resuelta');

    const report = await gemini.generateDailyReport(metrics, activeAlerts.length);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

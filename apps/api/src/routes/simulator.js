const express = require('express');
const router = express.Router();
const http = require('http');
const eventHub = require('../websocket/hub');
const env = require('../config/env');

let currentScenario = 'normal';

router.get('/status', (req, res) => {
  res.json({
    scenario: currentScenario,
    available_scenarios: [
      { id: 'normal', label: 'Normal (Flujo Doméstico Típico)', icon: '🟢', severity: 'normal' },
      { id: 'fuga_lenta', label: 'Fuga Lenta / Goteo Sanitario (1.4 L/min)', icon: '💧', severity: 'alerta_temprana' },
      { id: 'fuga_grande', label: 'Ruptura Mayor de Tubería (Reventón 36 L/min)', icon: '💥', severity: 'urgente' },
      { id: 'falta_agua', label: 'Corte de Suministro / Tinaco Vacío', icon: '🚫', severity: 'atencion' },
      { id: 'baja_presion', label: 'Baja Presión Municipal (< 0.8 bar)', icon: '📉', severity: 'atencion' },
      { id: 'congelamiento', label: 'Riesgo de Congelamiento (-2.8 °C)', icon: '❄️', severity: 'alerta_temprana' },
      { id: 'consumo_anomalo_nocturno', label: 'Consumo Nocturno No Programado (15 L/min)', icon: '🌙', severity: 'alerta_temprana' }
    ]
  });
});

router.post('/scenario', (req, res) => {
  const { scenario } = req.body;
  if (!scenario) return res.status(400).json({ error: 'Falta campo scenario' });

  currentScenario = scenario;

  // Try to forward command to simulator control port if running
  try {
    const url = new URL('/scenario', env.simulatorControlUrl);
    const postData = JSON.stringify({ scenario });
    const clientReq = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 1000
    }, (clientRes) => {});
    clientReq.on('error', (err) => {
      console.warn('Simulator control request failed:', err.message);
    });
    clientReq.write(postData);
    clientReq.end();
  } catch (err) {
    console.warn('Unable to create simulator control request:', err.message);
  }

  eventHub.broadcast('scenario_changed', { scenario });
  console.log(`🎮 Simulator scenario switched to: [${scenario.toUpperCase()}]`);

  res.json({ success: true, scenario: currentScenario });
});

module.exports = router;

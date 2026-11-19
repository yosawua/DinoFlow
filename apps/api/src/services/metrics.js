/**
 * Hydraulic Metrics & Financial Calculator
 */

const store = require('../db/store');
const env = require('../config/env');

async function calculateSummaryMetrics(siteId = 'site-casa-01') {
  const site = await store.getSiteById(siteId) || { cost_per_m3: env.waterCostPerM3, currency: env.defaultCurrency };
  const alerts = await store.getAlerts({ site_id: siteId });
  const readings = await store.getLatestReadings();

  // Active alerts (status: 'nueva' or 'vista')
  const activeAlerts = alerts.filter(a => a.status !== 'resuelta');

  // Breakdown by severity
  const severityCounts = {
    urgente: 0,
    alerta_temprana: 0,
    atencion: 0,
    normal: 0
  };

  activeAlerts.forEach(a => {
    if (severityCounts[a.severity] !== undefined) {
      severityCounts[a.severity]++;
    }
  });

  // Calculate cumulative loss from leaks
  let waterLostLiters = 0;
  alerts.forEach(a => {
    waterLostLiters += (a.estimated_loss_liters || 0);
  });

  const costPerM3 = site.cost_per_m3 || env.waterCostPerM3;
  const financialLossCost = Math.round((waterLostLiters / 1000) * costPerM3 * 100) / 100;

  // Approximate today's total volume (e.g., base domestic consumption 450 L + loss)
  const baseDailyConsumptionLiters = 420;
  const totalConsumptionLiters = baseDailyConsumptionLiters + waterLostLiters;
  const totalCost = Math.round((totalConsumptionLiters / 1000) * costPerM3 * 100) / 100;

  // System Health Index (100% - penalties for active alerts)
  let healthIndex = 100;
  healthIndex -= severityCounts.urgente * 35;
  healthIndex -= severityCounts.alerta_temprana * 15;
  healthIndex -= severityCounts.atencion * 5;
  healthIndex = Math.max(0, Math.min(100, healthIndex));

  return {
    site_id: siteId,
    site_name: site.name || 'Sitio DinoFlow',
    currency: site.currency || env.defaultCurrency,
    cost_per_m3: costPerM3,
    healthIndex,
    totalConsumptionLiters: Math.round(totalConsumptionLiters * 10) / 10,
    totalCost,
    waterLostLiters: Math.round(waterLostLiters * 10) / 10,
    financialLossCost,
    activeAlertsCount: activeAlerts.length,
    severityCounts,
    activeNodesCount: readings.length,
    lastUpdate: new Date().toISOString()
  };
}

module.exports = {
  calculateSummaryMetrics
};

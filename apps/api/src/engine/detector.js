/**
 * DinoFlow Anomaly Detection Engine
 * Evaluates real-time telemetry against statistical baselines and configurable rules.
 * 100% Local-first (Deterministic logic without requiring internet or AI).
 */

const { v4: uuidv4 } = require('uuid');
const baselineEngine = require('./baseline');

class DetectionEngine {
  constructor(options = {}) {
    this.waterCostPerM3 = options.waterCostPerM3 || 25.50;
    this.activeConditionCounters = new Map(); // key: ruleId:nodeId -> count
    this.alertCooldowns = new Map();         // key: ruleId:nodeId -> lastAlertTime
    this.cooldownDurationMs = 2 * 60 * 1000; // 2 minutes cooldown between duplicate alerts
    this.latestNodeReadings = new Map();     // key: nodeId -> reading
  }

  setWaterCost(cost) {
    this.waterCostPerM3 = cost;
  }

  /**
   * Main evaluation entry point
   * @param {Object} reading Validated sensor reading
   * @param {Array} rules List of active detection rules
   * @returns {Array} List of newly created Alert objects
   */
  evaluate(reading, rules = []) {
    const alerts = [];
    const now = new Date(reading.time);
    const hour = now.getHours();

    // Cache latest reading per node for cross-node / pipe delta calculations
    this.latestNodeReadings.set(reading.node_id, reading);

    // Update statistical baseline
    baselineEngine.updateWithSample(reading);
    const baseline = baselineEngine.getBaseline(reading.zone_id, reading.time);

    // Map rules by id
    const ruleMap = new Map(rules.map(r => [r.id, r]));

    // ========================================================
    // RULE 1: Flujo Continuo en Horario de Reposo (Fuga Nocturna)
    // ========================================================
    const ruleNocturna = ruleMap.get('rule-fuga-nocturna');
    if (ruleNocturna && ruleNocturna.is_enabled) {
      const cfg = ruleNocturna.config || {};
      const startHour = cfg.start_hour !== undefined ? cfg.start_hour : 1;
      const endHour = cfg.end_hour !== undefined ? cfg.end_hour : 5;
      const minFlow = cfg.min_flow_lpm !== undefined ? cfg.min_flow_lpm : 0.25;

      const inQuietWindow = hour >= startHour && hour <= endHour;
      if (inQuietWindow && reading.flow_lpm >= minFlow) {
        if (this._incrementCondition('rule-fuga-nocturna', reading.node_id, 3)) {
          const alert = this._buildAlert({
            ruleId: 'rule-fuga-nocturna',
            nodeId: reading.node_id,
            zoneId: reading.zone_id,
            siteId: reading.site_id,
            severity: ruleNocturna.severity || 'alerta_temprana',
            title: 'Flujo Continuo Detectado en Horario de Reposo',
            description: `Se registró flujo constante de ${reading.flow_lpm.toFixed(1)} L/min a las ${hour}:00 hrs sin demanda programada. Posible fuga lenta, goteo o válvula de retrete abierta.`,
            metricValue: reading.flow_lpm,
            thresholdValue: minFlow,
            unit: 'L/min',
            flowRateLpm: reading.flow_lpm,
            durationHours: 1
          });
          if (alert) alerts.push(alert);
        }
      } else {
        this._resetCondition('rule-fuga-nocturna', reading.node_id);
      }
    }

    // ========================================================
    // RULE 2: Caída Súbita de Presión (Ruptura Mayor de Tubería)
    // ========================================================
    const ruleRuptura = ruleMap.get('rule-caida-presion-ruptura');
    if (ruleRuptura && ruleRuptura.is_enabled) {
      const cfg = ruleRuptura.config || {};
      const minPressure = cfg.min_pressure_bar !== undefined ? cfg.min_pressure_bar : 0.6;
      const minFlow = cfg.min_flow_lpm !== undefined ? cfg.min_flow_lpm : 25.0;

      if (reading.pressure_bar <= minPressure && reading.flow_lpm >= minFlow) {
        if (this._incrementCondition('rule-caida-presion-ruptura', reading.node_id, 2)) {
          const alert = this._buildAlert({
            ruleId: 'rule-caida-presion-ruptura',
            nodeId: reading.node_id,
            zoneId: reading.zone_id,
            siteId: reading.site_id,
            severity: 'urgente',
            title: 'ALERTA URGENTE: Ruptura Mayor de Tubería Detectada',
            description: `Presión crítica de ${reading.pressure_bar.toFixed(2)} bar acompañada de un caudal torrencial de ${reading.flow_lpm.toFixed(1)} L/min. Indicio claro de reventón de tubería principal.`,
            metricValue: reading.pressure_bar,
            thresholdValue: minPressure,
            unit: 'bar',
            flowRateLpm: reading.flow_lpm,
            durationHours: 0.5
          });
          if (alert) alerts.push(alert);
        }
      } else {
        this._resetCondition('rule-caida-presion-ruptura', reading.node_id);
      }
    }

    // ========================================================
    // RULE 3: Falta de Suministro / Tinaco Vacío
    // ========================================================
    const ruleFaltaAgua = ruleMap.get('rule-falta-agua');
    if (ruleFaltaAgua && ruleFaltaAgua.is_enabled) {
      const cfg = ruleFaltaAgua.config || {};
      const maxPressure = cfg.max_pressure_bar !== undefined ? cfg.max_pressure_bar : 0.15;
      const maxFlow = cfg.max_flow_lpm !== undefined ? cfg.max_flow_lpm : 0.05;

      if (reading.pressure_bar <= maxPressure && reading.flow_lpm <= maxFlow) {
        if (this._incrementCondition('rule-falta-agua', reading.node_id, 3)) {
          const alert = this._buildAlert({
            ruleId: 'rule-falta-agua',
            nodeId: reading.node_id,
            zoneId: reading.zone_id,
            siteId: reading.site_id,
            severity: ruleFaltaAgua.severity || 'atencion',
            title: 'Corte de Suministro o Tubería Sin Presión',
            description: `Presión nula (${reading.pressure_bar.toFixed(2)} bar) y caudal cero. La red municipal no tiene suministro o la cisterna/tinaco se encuentra vacía.`,
            metricValue: reading.pressure_bar,
            thresholdValue: maxPressure,
            unit: 'bar',
            flowRateLpm: 0,
            durationHours: 0
          });
          if (alert) alerts.push(alert);
        }
      } else {
        this._resetCondition('rule-falta-agua', reading.node_id);
      }
    }

    // ========================================================
    // RULE 4: Baja Presión de Red
    // ========================================================
    const ruleBajaPresion = ruleMap.get('rule-baja-presion');
    if (ruleBajaPresion && ruleBajaPresion.is_enabled) {
      const cfg = ruleBajaPresion.config || {};
      const lowThreshold = cfg.low_pressure_threshold_bar !== undefined ? cfg.low_pressure_threshold_bar : 0.8;

      if (reading.pressure_bar < lowThreshold && reading.pressure_bar > 0.15) {
        if (this._incrementCondition('rule-baja-presion', reading.node_id, 3)) {
          const alert = this._buildAlert({
            ruleId: 'rule-baja-presion',
            nodeId: reading.node_id,
            zoneId: reading.zone_id,
            siteId: reading.site_id,
            severity: ruleBajaPresion.severity || 'atencion',
            title: 'Baja Presión en Línea de Distribución',
            description: `Presión de servicio de ${reading.pressure_bar.toFixed(2)} bar por debajo del estándar de confort (mínimo ${lowThreshold} bar).`,
            metricValue: reading.pressure_bar,
            thresholdValue: lowThreshold,
            unit: 'bar',
            flowRateLpm: 0,
            durationHours: 0
          });
          if (alert) alerts.push(alert);
        }
      } else {
        this._resetCondition('rule-baja-presion', reading.node_id);
      }
    }

    // ========================================================
    // RULE 5: Balance de Tramo Hidráulico (Diferencial Entrada - Salida)
    // ========================================================
    const ruleDelta = ruleMap.get('rule-fuga-tramo-delta');
    if (ruleDelta && ruleDelta.is_enabled) {
      const cfg = ruleDelta.config || {};
      const inletNodeId = cfg.inlet_node_id || 'node-acometida-01';
      const outletNodeId = cfg.outlet_node_id || 'node-cocina-01';
      const minDelta = cfg.min_delta_lpm !== undefined ? cfg.min_delta_lpm : 2.0;

      const inletReading = this.latestNodeReadings.get(inletNodeId);
      const outletReading = this.latestNodeReadings.get(outletNodeId);

      if (inletReading && outletReading) {
        const deltaFlow = inletReading.flow_lpm - outletReading.flow_lpm;
        if (deltaFlow >= minDelta) {
          if (this._incrementCondition('rule-fuga-tramo-delta', inletNodeId, 2)) {
            const alert = this._buildAlert({
              ruleId: 'rule-fuga-tramo-delta',
              nodeId: inletNodeId,
              zoneId: inletReading.zone_id,
              siteId: inletReading.site_id,
              severity: 'urgente',
              title: 'Pérdida en Tramo Hidráulico Cerrado (Fuga Oculta)',
              description: `Diferencia de caudal de ${deltaFlow.toFixed(1)} L/min entre entrada (${inletReading.flow_lpm.toFixed(1)} L/min) y salida (${outletReading.flow_lpm.toFixed(1)} L/min). Pérdida de agua oculta en la tubería intermedia.`,
              metricValue: deltaFlow,
              thresholdValue: minDelta,
              unit: 'L/min',
              flowRateLpm: deltaFlow,
              durationHours: 1
            });
            if (alert) alerts.push(alert);
          }
        } else {
          this._resetCondition('rule-fuga-tramo-delta', inletNodeId);
        }
      }
    }

    // ========================================================
    // RULE 6: Temperatura Extrema (Congelamiento / Sobrecalentamiento)
    // ========================================================
    const ruleTemp = ruleMap.get('rule-temperatura-extrema');
    if (ruleTemp && ruleTemp.is_enabled) {
      const cfg = ruleTemp.config || {};
      const freezeLimit = cfg.freeze_threshold_c !== undefined ? cfg.freeze_threshold_c : 3.0;
      const overheatLimit = cfg.overheat_threshold_c !== undefined ? cfg.overheat_threshold_c : 55.0;

      if (reading.temperature_c <= freezeLimit) {
        if (this._incrementCondition('rule-temperatura-extrema-freeze', reading.node_id, 2)) {
          const alert = this._buildAlert({
            ruleId: 'rule-temperatura-extrema',
            nodeId: reading.node_id,
            zoneId: reading.zone_id,
            siteId: reading.site_id,
            severity: 'alerta_temprana',
            title: 'Riesgo Crítico de Congelamiento de Tubería',
            description: `Temperatura del agua en ${reading.temperature_c.toFixed(1)}°C (umbral de seguridad ${freezeLimit}°C). Alto riesgo de ruptura por expansión de hielo.`,
            metricValue: reading.temperature_c,
            thresholdValue: freezeLimit,
            unit: '°C',
            flowRateLpm: 0,
            durationHours: 0
          });
          if (alert) alerts.push(alert);
        }
      } else if (reading.temperature_c >= overheatLimit) {
        if (this._incrementCondition('rule-temperatura-extrema-heat', reading.node_id, 2)) {
          const alert = this._buildAlert({
            ruleId: 'rule-temperatura-extrema',
            nodeId: reading.node_id,
            zoneId: reading.zone_id,
            siteId: reading.site_id,
            severity: 'atencion',
            title: 'Sobrecalentamiento Anómalo en Red Hidráulica',
            description: `Temperatura del agua en ${reading.temperature_c.toFixed(1)}°C supera los 55°C en línea de agua. Posible retorno indebido de caldera o fallo de válvula check.`,
            metricValue: reading.temperature_c,
            thresholdValue: overheatLimit,
            unit: '°C',
            flowRateLpm: 0,
            durationHours: 0
          });
          if (alert) alerts.push(alert);
        }
      } else {
        this._resetCondition('rule-temperatura-extrema-freeze', reading.node_id);
        this._resetCondition('rule-temperatura-extrema-heat', reading.node_id);
      }
    }

    return alerts;
  }

  _incrementCondition(ruleId, nodeId, requiredHits) {
    const key = `${ruleId}:${nodeId}`;
    const count = (this.activeConditionCounters.get(key) || 0) + 1;
    this.activeConditionCounters.set(key, count);
    return count >= requiredHits;
  }

  _resetCondition(ruleId, nodeId) {
    const key = `${ruleId}:${nodeId}`;
    this.activeConditionCounters.delete(key);
  }

  _buildAlert(params) {
    const { ruleId, nodeId, zoneId, siteId, severity, title, description, metricValue, thresholdValue, unit, flowRateLpm = 0, durationHours = 1 } = params;
    const cooldownKey = `${ruleId}:${nodeId}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;

    // Throttle duplicate alerts during cooldown period
    if (now - lastAlert < this.cooldownDurationMs) {
      return null;
    }
    this.alertCooldowns.set(cooldownKey, now);

    // Calculate volume lost and cost
    const estimatedLossLiters = Math.round(flowRateLpm * 60 * durationHours * 10) / 10;
    const estimatedLossCost = Math.round((estimatedLossLiters / 1000) * this.waterCostPerM3 * 100) / 100;

    return {
      id: `alt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      site_id: siteId,
      zone_id: zoneId,
      node_id: nodeId,
      rule_id: ruleId,
      severity,
      title,
      description,
      metric_value: Math.round(metricValue * 100) / 100,
      threshold_value: Math.round(thresholdValue * 100) / 100,
      unit,
      status: 'nueva',
      ai_explanation: null,
      ai_recommendations: null,
      estimated_loss_liters: estimatedLossLiters,
      estimated_loss_cost: estimatedLossCost,
      created_at: new Date().toISOString()
    };
  }
}

module.exports = DetectionEngine;

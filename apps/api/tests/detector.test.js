const test = require('node:test');
const assert = require('node:assert');
const DetectionEngine = require('../src/engine/detector');

const sampleRules = [
  {
    id: 'rule-fuga-nocturna',
    severity: 'alerta_temprana',
    is_enabled: true,
    config: { start_hour: 1, end_hour: 5, min_flow_lpm: 0.25 }
  },
  {
    id: 'rule-caida-presion-ruptura',
    severity: 'urgente',
    is_enabled: true,
    config: { min_pressure_bar: 0.6, min_flow_lpm: 25.0 }
  },
  {
    id: 'rule-falta-agua',
    severity: 'atencion',
    is_enabled: true,
    config: { max_pressure_bar: 0.15, max_flow_lpm: 0.05 }
  },
  {
    id: 'rule-baja-presion',
    severity: 'atencion',
    is_enabled: true,
    config: { low_pressure_threshold_bar: 0.8 }
  },
  {
    id: 'rule-fuga-tramo-delta',
    severity: 'urgente',
    is_enabled: true,
    config: { inlet_node_id: 'node-inlet', outlet_node_id: 'node-outlet', min_delta_lpm: 2.0 }
  },
  {
    id: 'rule-temperatura-extrema',
    severity: 'alerta_temprana',
    is_enabled: true,
    config: { freeze_threshold_c: 3.0, overheat_threshold_c: 55.0 }
  }
];

test('Detection Engine: does NOT trigger alert during normal hydraulic operation', () => {
  const detector = new DetectionEngine();
  const reading = {
    time: '2026-11-18T14:30:00Z', // 2 PM
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: 8.5,
    pressure_bar: 2.3,
    temperature_c: 21.0
  };

  const alerts = detector.evaluate(reading, sampleRules);
  assert.strictEqual(alerts.length, 0);
});

test('Detection Engine: triggers URGENT alert on pipe rupture (pressure crash + high flow)', () => {
  const detector = new DetectionEngine({ waterCostPerM3: 25.0 });
  const ruptureReading = {
    time: new Date().toISOString(),
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: 35.0,
    pressure_bar: 0.4, // crashed pressure
    temperature_c: 20.0
  };

  // Condition requires 2 sustained hits
  detector.evaluate(ruptureReading, sampleRules);
  const alerts = detector.evaluate(ruptureReading, sampleRules);

  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].severity, 'urgente');
  assert.strictEqual(alerts[0].rule_id, 'rule-caida-presion-ruptura');
  assert.ok(alerts[0].estimated_loss_liters > 0);
  assert.ok(alerts[0].estimated_loss_cost > 0);
});

test('Detection Engine: triggers alert on nocturnal continuous flow', () => {
  const detector = new DetectionEngine();
  // 3:00 AM nocturnal reading
  const nightDate = new Date();
  nightDate.setHours(3, 15, 0, 0);

  const nightReading = {
    time: nightDate.toISOString(),
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: 1.2, // constant leak
    pressure_bar: 2.2,
    temperature_c: 19.5
  };

  // Requires 3 sustained hits
  detector.evaluate(nightReading, sampleRules);
  detector.evaluate(nightReading, sampleRules);
  const alerts = detector.evaluate(nightReading, sampleRules);

  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].rule_id, 'rule-fuga-nocturna');
  assert.strictEqual(alerts[0].severity, 'alerta_temprana');
});

test('Detection Engine: triggers tramo delta loss when inlet exceeds outlet', () => {
  const detector = new DetectionEngine();

  const inletReading = {
    time: new Date().toISOString(),
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-inlet',
    flow_lpm: 20.0,
    pressure_bar: 2.0,
    temperature_c: 20.0
  };

  const outletReading = {
    time: new Date().toISOString(),
    site_id: 'site-casa-01',
    zone_id: 'zone-cocina-pb',
    node_id: 'node-outlet',
    flow_lpm: 5.0, // delta is 15 L/min
    pressure_bar: 1.8,
    temperature_c: 20.0
  };

  detector.evaluate(inletReading, sampleRules);
  const alerts1 = detector.evaluate(outletReading, sampleRules);
  const alerts2 = detector.evaluate(inletReading, sampleRules);
  const allAlerts = [...alerts1, ...alerts2];

  assert.ok(allAlerts.some(a => a.rule_id === 'rule-fuga-tramo-delta'));
});

test('Detection Engine: triggers freeze warning when temperature drops below 3°C', () => {
  const detector = new DetectionEngine();
  const freezeReading = {
    time: new Date().toISOString(),
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: 0.0,
    pressure_bar: 2.5,
    temperature_c: -1.5
  };

  detector.evaluate(freezeReading, sampleRules);
  const alerts = detector.evaluate(freezeReading, sampleRules);

  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].rule_id, 'rule-temperatura-extrema');
});

const test = require('node:test');
const assert = require('node:assert');
const { validateTelemetry } = require('../src/engine/validation');

test('Validation: accepts well-formed telemetry payload', () => {
  const input = {
    time: new Date().toISOString(),
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: 12.4,
    pressure_bar: 2.3,
    temperature_c: 21.5
  };

  const result = validateTelemetry(input);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.data.flow_lpm, 12.4);
  assert.strictEqual(result.data.pressure_bar, 2.3);
  assert.strictEqual(result.data.temperature_c, 21.5);
});

test('Validation: rejects payload with negative flow rate', () => {
  const input = {
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: -5.0,
    pressure_bar: 2.0,
    temperature_c: 20.0
  };

  const result = validateTelemetry(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('no negativo')));
});

test('Validation: rejects payload with pressure exceeding safety limits', () => {
  const input = {
    site_id: 'site-casa-01',
    zone_id: 'zone-acometida',
    node_id: 'node-acometida-01',
    flow_lpm: 5.0,
    pressure_bar: 99.0, // physically impossible for domestic line
    temperature_c: 20.0
  };

  const result = validateTelemetry(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('excede el límite máximo')));
});

test('Validation: rejects payload with missing zone or site identifiers', () => {
  const input = {
    node_id: 'node-acometida-01',
    flow_lpm: 5.0,
    pressure_bar: 2.0,
    temperature_c: 20.0
  };

  const result = validateTelemetry(input);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length >= 2);
});

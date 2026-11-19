/**
 * Telemetry validation and sanitization
 * Rejects invalid, corrupted or out-of-range sensor readings
 */

function validateTelemetry(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['El cuerpo del mensaje no es un objeto JSON válido'] };
  }

  // Required identifiers
  if (!payload.site_id || typeof payload.site_id !== 'string') {
    errors.push('Falta o es inválido "site_id"');
  }
  if (!payload.zone_id || typeof payload.zone_id !== 'string') {
    errors.push('Falta o es inválido "zone_id"');
  }
  if (!payload.node_id || typeof payload.node_id !== 'string') {
    errors.push('Falta o es inválido "node_id"');
  }

  // Validate Timestamp
  let timestamp = payload.time ? new Date(payload.time) : new Date();
  if (isNaN(timestamp.getTime())) {
    timestamp = new Date(); // Fallback to ingest time if unparseable
  }

  // Flow rate validation (L/min)
  let flow_lpm = Number(payload.flow_lpm);
  if (isNaN(flow_lpm) || flow_lpm < 0) {
    errors.push('El caudal "flow_lpm" debe ser un número no negativo');
  } else if (flow_lpm > 500) {
    errors.push(`El caudal "flow_lpm" (${flow_lpm}) excede el límite físico de 500 L/min`);
  }

  // Pressure validation (bar)
  let pressure_bar = Number(payload.pressure_bar);
  if (isNaN(pressure_bar) || pressure_bar < 0) {
    errors.push('La presión "pressure_bar" debe ser un número no negativo');
  } else if (pressure_bar > 25.0) {
    errors.push(`La presión "pressure_bar" (${pressure_bar}) excede el límite máximo de seguridad de 25 bar`);
  }

  // Temperature validation (°C)
  let temperature_c = Number(payload.temperature_c);
  if (isNaN(temperature_c) || temperature_c < -40 || temperature_c > 125) {
    errors.push(`Temperatura "${temperature_c}" fuera del rango operativo de sensores (-40°C a 125°C)`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      time: timestamp.toISOString(),
      site_id: String(payload.site_id).trim(),
      zone_id: String(payload.zone_id).trim(),
      node_id: String(payload.node_id).trim(),
      flow_lpm: Math.round(flow_lpm * 100) / 100,
      pressure_bar: Math.round(pressure_bar * 100) / 100,
      temperature_c: Math.round(temperature_c * 10) / 10,
      battery_pct: payload.battery_pct !== undefined ? Number(payload.battery_pct) : 100,
      rssi: payload.rssi !== undefined ? Number(payload.rssi) : -60,
      flags: payload.flags !== undefined ? Number(payload.flags) : 0
    }
  };
}

module.exports = {
  validateTelemetry
};

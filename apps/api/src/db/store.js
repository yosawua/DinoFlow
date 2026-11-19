/**
 * DinoFlow Database Store
 * Hybrid Repository: TimescaleDB / PostgreSQL with resilient local in-memory fallback
 */

const { Pool } = require('pg');
const env = require('../config/env');

let pool = null;
let usePostgres = false;

// In-Memory Fallback State (initialized with demo seed)
const memoryStore = {
  sites: [
    {
      id: 'site-casa-01',
      name: 'Residencia Las Palmas (Demo)',
      address: 'Av. Acueducto 1420, Zapopan, Jalisco',
      site_type: 'residencial',
      cost_per_m3: env.waterCostPerM3,
      currency: env.defaultCurrency,
      created_at: new Date().toISOString()
    }
  ],
  zones: [
    { id: 'zone-acometida', site_id: 'site-casa-01', name: 'Acometida Principal', description: 'Medidor de calle y válvula reductora', floor_level: 0, is_critical: true },
    { id: 'zone-jardin', site_id: 'site-casa-01', name: 'Jardín y Riego Exterior', description: 'Línea de riego y aspersores', floor_level: 0, is_critical: false },
    { id: 'zone-cocina-pb', site_id: 'site-casa-01', name: 'Cocina y Baño PB', description: 'Alimentación fregadero y medio baño', floor_level: 0, is_critical: false },
    { id: 'zone-planta-alta', site_id: 'site-casa-01', name: 'Tinaco y Baños PA', description: 'Bajada de tinaco hacia regaderas', floor_level: 1, is_critical: true }
  ],
  hydraulicLines: [
    {
      id: 'line-acometida-distribucion',
      site_id: 'site-casa-01',
      zone_id: 'zone-acometida',
      name: 'Tramo Acometida a Distribuidor Cocina',
      material: 'PPR',
      diameter_inches: 1.0,
      max_safe_pressure_bar: 4.5,
      min_safe_pressure_bar: 1.0,
      inlet_node_id: 'node-acometida-01',
      outlet_node_id: 'node-cocina-01'
    }
  ],
  nodes: [
    { id: 'node-acometida-01', site_id: 'site-casa-01', zone_id: 'zone-acometida', name: 'Nodo Acometida', mac_address: '24:6F:28:B1:A0:10', connection_type: 'wifi', ip_address: '192.168.1.101', status: 'online', last_seen_at: new Date().toISOString() },
    { id: 'node-jardin-01', site_id: 'site-casa-01', zone_id: 'zone-jardin', name: 'Nodo Jardín', mac_address: '24:6F:28:B1:A0:11', connection_type: 'wifi', ip_address: '192.168.1.102', status: 'online', last_seen_at: new Date().toISOString() },
    { id: 'node-cocina-01', site_id: 'site-casa-01', zone_id: 'zone-cocina-pb', name: 'Nodo Cocina', mac_address: '24:6F:28:B1:A0:12', connection_type: 'wifi', ip_address: '192.168.1.103', status: 'online', last_seen_at: new Date().toISOString() },
    { id: 'node-tinaco-01', site_id: 'site-casa-01', zone_id: 'zone-planta-alta', name: 'Nodo Tinaco', mac_address: '24:6F:28:B1:A0:13', connection_type: 'rs485', ip_address: '192.168.1.104', status: 'online', last_seen_at: new Date().toISOString() }
  ],
  sensors: [
    { id: 'sens-flw-01', node_id: 'node-acometida-01', sensor_type: 'flow', model: 'YF-S201', unit: 'L/min' },
    { id: 'sens-prs-01', node_id: 'node-acometida-01', sensor_type: 'pressure', model: 'SEN0257', unit: 'bar' },
    { id: 'sens-tmp-01', node_id: 'node-acometida-01', sensor_type: 'temperature', model: 'DS18B20', unit: '°C' },
    { id: 'sens-flw-02', node_id: 'node-cocina-01', sensor_type: 'flow', model: 'YF-S201', unit: 'L/min' }
  ],
  readings: [], // max 5000 in memory
  latestReadings: new Map(), // key: node_id -> reading
  rules: [
    {
      id: 'rule-fuga-nocturna',
      name: 'Flujo Continuo en Horario de Reposo',
      description: 'Detecta consumo anómalo constante entre 01:00 y 05:00 hrs',
      severity: 'alerta_temprana',
      is_enabled: true,
      config: { start_hour: 1, end_hour: 5, min_flow_lpm: 0.25, sustained_seconds: 10 }
    },
    {
      id: 'rule-caida-presion-ruptura',
      name: 'Caída Súbita de Presión (Ruptura Mayor)',
      description: 'Presión baja con flujo alto repentino',
      severity: 'urgente',
      is_enabled: true,
      config: { min_pressure_bar: 0.6, min_flow_lpm: 25.0, sustained_seconds: 6 }
    },
    {
      id: 'rule-falta-agua',
      name: 'Falta de Suministro / Tinaco Vacío',
      description: 'Presión prácticamente cero y flujo nulo en demanda',
      severity: 'atencion',
      is_enabled: true,
      config: { max_pressure_bar: 0.15, max_flow_lpm: 0.05, sustained_seconds: 8 }
    },
    {
      id: 'rule-baja-presion',
      name: 'Baja Presión de Red',
      description: 'Presión de servicio por debajo del estándar mínimo de confort',
      severity: 'atencion',
      is_enabled: true,
      config: { low_pressure_threshold_bar: 0.8, sustained_seconds: 10 }
    },
    {
      id: 'rule-fuga-tramo-delta',
      name: 'Diferencia de Flujo Entre Nodos (Tramo)',
      description: 'Pérdida hidráulica en tramo cerrado entre nodo acometida y cocina',
      severity: 'urgente',
      is_enabled: true,
      config: { inlet_node_id: 'node-acometida-01', outlet_node_id: 'node-cocina-01', min_delta_lpm: 2.0, sustained_seconds: 6 }
    },
    {
      id: 'rule-temperatura-extrema',
      name: 'Riesgo de Congelamiento o Sobrecalentamiento',
      description: 'Temperatura fuera del rango de seguridad operativa',
      severity: 'alerta_temprana',
      is_enabled: true,
      config: { freeze_threshold_c: 3.0, overheat_threshold_c: 55.0 }
    }
  ],
  alerts: []
};

// Initialize DB connection
async function initDb() {
  try {
    pool = new Pool({
      connectionString: env.databaseUrl,
      connectionTimeoutMillis: 3000
    });

    const client = await pool.connect();
    usePostgres = true;
    client.release();
    console.log('🐘 PostgreSQL / TimescaleDB connected successfully.');
  } catch (err) {
    console.warn(`⚠️  Could not connect to PostgreSQL (${err.message}). Using resilient local in-memory store.`);
    usePostgres = false;
  }
}

// Data Access Methods
const store = {
  initDb,

  isUsingPostgres() {
    return usePostgres;
  },

  // SITES
  async getSites() {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM sites ORDER BY created_at DESC');
      return res.rows;
    }
    return memoryStore.sites;
  },

  async getSiteById(id) {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return memoryStore.sites.find(s => s.id === id) || null;
  },

  async createSite(site) {
    if (usePostgres) {
      const res = await pool.query(
        `INSERT INTO sites (id, name, address, site_type, cost_per_m3, currency)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [site.id, site.name, site.address || '', site.site_type || 'residencial', site.cost_per_m3 || env.waterCostPerM3, site.currency || env.defaultCurrency]
      );
      return res.rows[0];
    }
    memoryStore.sites.push(site);
    return site;
  },

  // ZONES
  async getZones(siteId) {
    if (usePostgres) {
      const query = siteId
        ? 'SELECT * FROM zones WHERE site_id = $1 ORDER BY floor_level, name'
        : 'SELECT * FROM zones ORDER BY site_id, floor_level, name';
      const params = siteId ? [siteId] : [];
      const res = await pool.query(query, params);
      return res.rows;
    }
    return siteId ? memoryStore.zones.filter(z => z.site_id === siteId) : memoryStore.zones;
  },

  async createZone(zone) {
    if (usePostgres) {
      const res = await pool.query(
        `INSERT INTO zones (id, site_id, name, description, floor_level, is_critical)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [zone.id, zone.site_id, zone.name, zone.description || '', zone.floor_level || 0, zone.is_critical || false]
      );
      return res.rows[0];
    }
    memoryStore.zones.push(zone);
    return zone;
  },

  // HYDRAULIC LINES
  async getHydraulicLines(siteId) {
    if (usePostgres) {
      const query = siteId ? 'SELECT * FROM hydraulic_lines WHERE site_id = $1' : 'SELECT * FROM hydraulic_lines';
      const res = await pool.query(query, siteId ? [siteId] : []);
      return res.rows;
    }
    return siteId ? memoryStore.hydraulicLines.filter(l => l.site_id === siteId) : memoryStore.hydraulicLines;
  },

  // NODES
  async getNodes(siteId) {
    if (usePostgres) {
      const query = siteId ? 'SELECT * FROM nodes WHERE site_id = $1' : 'SELECT * FROM nodes';
      const res = await pool.query(query, siteId ? [siteId] : []);
      return res.rows;
    }
    return siteId ? memoryStore.nodes.filter(n => n.site_id === siteId) : memoryStore.nodes;
  },

  async getNodeById(id) {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM nodes WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return memoryStore.nodes.find(n => n.id === id) || null;
  },

  async createOrUpdateNode(node) {
    if (usePostgres) {
      const res = await pool.query(
        `INSERT INTO nodes (id, site_id, zone_id, name, mac_address, connection_type, ip_address, status, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           zone_id = EXCLUDED.zone_id,
           name = EXCLUDED.name,
           status = EXCLUDED.status,
           last_seen_at = NOW()
         RETURNING *`,
        [node.id, node.site_id, node.zone_id, node.name, node.mac_address || '', node.connection_type || 'wifi', node.ip_address || '', node.status || 'online']
      );
      return res.rows[0];
    }
    const idx = memoryStore.nodes.findIndex(n => n.id === node.id);
    const updated = { ...node, last_seen_at: new Date().toISOString() };
    if (idx >= 0) {
      memoryStore.nodes[idx] = { ...memoryStore.nodes[idx], ...updated };
    } else {
      memoryStore.nodes.push(updated);
    }
    return updated;
  },

  // SENSOR READINGS
  async saveReading(reading) {
    // Update latest reading cache
    memoryStore.latestReadings.set(reading.node_id, reading);

    if (usePostgres) {
      try {
        await pool.query(
          `INSERT INTO sensor_readings (time, node_id, zone_id, site_id, flow_lpm, pressure_bar, temperature_c, battery_pct, rssi, flags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [reading.time, reading.node_id, reading.zone_id, reading.site_id, reading.flow_lpm, reading.pressure_bar, reading.temperature_c, reading.battery_pct, reading.rssi, reading.flags]
        );
      } catch (e) {
        console.error('Error inserting reading into PostgreSQL:', e.message);
      }
    }

    // Keep ring buffer in memory (last 2000 points)
    memoryStore.readings.push(reading);
    if (memoryStore.readings.length > 2000) {
      memoryStore.readings.shift();
    }
    return reading;
  },

  async getLatestReadings() {
    return Array.from(memoryStore.latestReadings.values());
  },

  async getReadingsHistory(filter = {}) {
    const { zone_id, node_id, limit = 100 } = filter;
    if (usePostgres) {
      let query = 'SELECT * FROM sensor_readings WHERE 1=1';
      const params = [];
      if (zone_id) {
        params.push(zone_id);
        query += ` AND zone_id = $${params.length}`;
      }
      if (node_id) {
        params.push(node_id);
        query += ` AND node_id = $${params.length}`;
      }
      query += ` ORDER BY time DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      const res = await pool.query(query, params);
      return res.rows.reverse();
    }

    let list = memoryStore.readings;
    if (zone_id) list = list.filter(r => r.zone_id === zone_id);
    if (node_id) list = list.filter(r => r.node_id === node_id);
    return list.slice(-limit);
  },

  // RULES
  async getRules() {
    if (usePostgres) {
      const res = await pool.query('SELECT * FROM detection_rules');
      return res.rows;
    }
    return memoryStore.rules;
  },

  async updateRuleConfig(id, config, isEnabled) {
    if (usePostgres) {
      const res = await pool.query(
        'UPDATE detection_rules SET config = $1, is_enabled = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [JSON.stringify(config), isEnabled, id]
      );
      return res.rows[0];
    }
    const rule = memoryStore.rules.find(r => r.id === id);
    if (rule) {
      if (config) rule.config = { ...rule.config, ...config };
      if (isEnabled !== undefined) rule.is_enabled = isEnabled;
    }
    return rule;
  },

  // ALERTS
  async getAlerts(filter = {}) {
    const { status, site_id, limit = 50 } = filter;
    if (usePostgres) {
      let query = 'SELECT * FROM alerts WHERE 1=1';
      const params = [];
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      if (site_id) {
        params.push(site_id);
        query += ` AND site_id = $${params.length}`;
      }
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      const res = await pool.query(query, params);
      return res.rows;
    }

    let list = [...memoryStore.alerts];
    if (status) list = list.filter(a => a.status === status);
    if (site_id) list = list.filter(a => a.site_id === site_id);
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
  },

  async saveAlert(alert) {
    if (usePostgres) {
      try {
        await pool.query(
          `INSERT INTO alerts (id, site_id, zone_id, node_id, rule_id, severity, title, description, metric_value, threshold_value, unit, status, ai_explanation, ai_recommendations, estimated_loss_liters, estimated_loss_cost, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             ai_explanation = EXCLUDED.ai_explanation,
             ai_recommendations = EXCLUDED.ai_recommendations`,
          [
            alert.id, alert.site_id, alert.zone_id, alert.node_id, alert.rule_id, alert.severity,
            alert.title, alert.description, alert.metric_value, alert.threshold_value, alert.unit,
            alert.status || 'nueva', alert.ai_explanation || '', alert.ai_recommendations || '',
            alert.estimated_loss_liters || 0, alert.estimated_loss_cost || 0, alert.created_at
          ]
        );
      } catch (e) {
        console.error('Error inserting alert into PostgreSQL:', e.message);
      }
    }

    const idx = memoryStore.alerts.findIndex(a => a.id === alert.id);
    if (idx >= 0) {
      memoryStore.alerts[idx] = { ...memoryStore.alerts[idx], ...alert };
    } else {
      memoryStore.alerts.unshift(alert);
    }
    return alert;
  },

  async updateAlertStatus(id, status, resolvedBy = 'usuario') {
    const resolvedAt = status === 'resuelta' ? new Date().toISOString() : null;
    if (usePostgres) {
      const res = await pool.query(
        'UPDATE alerts SET status = $1, resolved_at = $2, resolved_by = $3 WHERE id = $4 RETURNING *',
        [status, resolvedAt, resolvedBy, id]
      );
      return res.rows[0];
    }
    const alert = memoryStore.alerts.find(a => a.id === id);
    if (alert) {
      alert.status = status;
      alert.resolved_at = resolvedAt;
      alert.resolved_by = resolvedBy;
    }
    return alert;
  }
};

module.exports = store;

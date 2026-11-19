/**
 * DinoFlow IoT Sensor & Hydraulic Network Simulator
 * Generates realistic water flow, pressure, and temperature telemetry
 * and allows real-time injection of hydraulic anomalies.
 */

const mqtt = require('mqtt');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const HTTP_API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const SITE_ID = 'site-casa-01';

// Command line arguments
const args = process.argv.slice(2);
function getArg(flag, defaultVal) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultVal;
}

let currentScenario = getArg('--scenario', 'normal');
const publishIntervalMs = parseInt(getArg('--interval', '2000'), 10);
const controlPort = parseInt(getArg('--control-port', '3002'), 10);

console.log('====================================================');
console.log('🦖 DinoFlow IoT Hydraulic Simulator');
console.log(`🌐 MQTT Broker: ${MQTT_BROKER}`);
console.log(`📡 Fallback HTTP: ${HTTP_API_URL}/api/v1/telemetry`);
console.log(`⏱️  Interval: ${publishIntervalMs} ms`);
console.log(`🎭 Current Scenario: [${currentScenario.toUpperCase()}]`);
console.log('====================================================');

// Simulated Nodes Definition
const NODES = [
  {
    node_id: 'node-acometida-01',
    zone_id: 'zone-acometida',
    name: 'Acometida Calle',
    is_inlet: true,
    base_pressure: 2.6, // bar
    base_temp: 20.5     // °C
  },
  {
    node_id: 'node-cocina-01',
    zone_id: 'zone-cocina-pb',
    name: 'Cocina & Baño PB',
    is_outlet: true,
    base_pressure: 2.4, // bar
    base_temp: 21.0     // °C
  },
  {
    node_id: 'node-jardin-01',
    zone_id: 'zone-jardin',
    name: 'Riego Jardín',
    is_outlet: false,
    base_pressure: 2.2, // bar
    base_temp: 23.5     // °C
  },
  {
    node_id: 'node-tinaco-01',
    zone_id: 'zone-planta-alta',
    name: 'Tinaco Planta Alta',
    is_outlet: false,
    base_pressure: 1.8, // bar
    base_temp: 22.0     // °C
  }
];

// Telemetry Generator State
let tickCount = 0;
let mqttConnected = false;
let client = null;

try {
  client = mqtt.connect(MQTT_BROKER, {
    reconnectPeriod: 3000,
    connectTimeout: 4000,
    clientId: `dinoflow-sim-${Math.random().toString(16).slice(2, 8)}`
  });

  client.on('connect', () => {
    mqttConnected = true;
    console.log('✅ Connected to Mosquitto MQTT Broker.');
  });

  client.on('error', (err) => {
    mqttConnected = false;
    // Don't crash; fallback to HTTP
  });

  client.on('offline', () => {
    mqttConnected = false;
  });
} catch (e) {
  console.log('⚠️ MQTT Broker unavailable, running in HTTP fallback mode.');
}

/**
 * Generates realistic hydraulic readings based on active scenario and node role
 */
function generateReadings(node, scenario, tick) {
  const now = new Date();
  const hour = now.getHours();
  const noise = (Math.random() - 0.5) * 0.1;

  let flow_lpm = 0.0;
  let pressure_bar = node.base_pressure + noise;
  let temperature_c = node.base_temp + (Math.random() - 0.5) * 0.2;

  // Base diurnal pattern (normal taps activity)
  const isDaytime = hour >= 6 && hour <= 23;
  const isMealTime = (hour >= 7 && hour <= 9) || (hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21);

  if (scenario === 'normal') {
    // Normal household consumption cycle
    if (isMealTime) {
      flow_lpm = 8.5 + (Math.sin(tick * 0.4) * 3.5) + noise * 5;
    } else if (isDaytime) {
      flow_lpm = (tick % 7 === 0) ? (4.2 + Math.random() * 2) : 0.0;
    } else {
      flow_lpm = 0.0; // Sleep hours
    }
    // Pressure drops slightly when flow is high (Bernoulli principle)
    pressure_bar -= (flow_lpm * 0.03);

  } else if (scenario === 'fuga_lenta') {
    // Persistent silent leak (drip, toilet flapper valve)
    flow_lpm = 1.45 + (Math.sin(tick * 0.1) * 0.3) + noise;
    pressure_bar = Math.max(1.8, node.base_pressure - 0.25);

  } else if (scenario === 'fuga_grande') {
    // Catastrophic pipe burst between Acometida and Cocina
    if (node.is_inlet) {
      // Upstream water rushes out at high speed
      flow_lpm = 36.5 + (Math.sin(tick * 0.5) * 2.5) + noise * 3;
      pressure_bar = 0.42 + (Math.random() * 0.08); // Pressure crashes
    } else if (node.is_outlet) {
      // Downstream node receives almost no water due to upstream rupture
      flow_lpm = 1.8 + noise;
      pressure_bar = 0.38 + (Math.random() * 0.05);
    } else {
      flow_lpm = 0.0;
      pressure_bar = 0.40;
    }

  } else if (scenario === 'falta_agua') {
    // Municipal water supply cut
    flow_lpm = 0.0;
    pressure_bar = 0.04 + (Math.random() * 0.02); // Zero line pressure

  } else if (scenario === 'baja_presion') {
    // Low municipal pressure
    flow_lpm = Math.max(0, 1.8 + noise);
    pressure_bar = 0.62 + (Math.sin(tick * 0.2) * 0.08);

  } else if (scenario === 'congelamiento') {
    // Freezing temperatures
    temperature_c = -2.8 + (Math.random() * 0.4);
    flow_lpm = 0.0;
    pressure_bar = node.base_pressure + 0.3; // Ice expansion increases pressure

  } else if (scenario === 'sobrecalentamiento') {
    temperature_c = 58.5 + (Math.random() * 1.5);
    flow_lpm = 3.5;
    pressure_bar = 2.1;

  } else if (scenario === 'consumo_anomalo_nocturno') {
    // Large continuous flow during night hours
    flow_lpm = 14.8 + (Math.sin(tick * 0.3) * 1.2);
    pressure_bar = 2.0;
  }

  // Sanitize decimals
  return {
    time: now.toISOString(),
    site_id: SITE_ID,
    zone_id: node.zone_id,
    node_id: node.node_id,
    flow_lpm: Math.max(0, parseFloat(flow_lpm.toFixed(2))),
    pressure_bar: Math.max(0, parseFloat(pressure_bar.toFixed(2))),
    temperature_c: parseFloat(temperature_c.toFixed(1)),
    battery_pct: 98.5,
    rssi: -58 + Math.floor(Math.random() * 6),
    flags: scenario !== 'normal' ? 1 : 0
  };
}

/**
 * Sends telemetry via HTTP to backend fallback endpoint
 */
function sendHttpFallback(payload) {
  const url = new URL('/api/v1/telemetry', HTTP_API_URL);
  const data = JSON.stringify(payload);

  const req = http.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    },
    timeout: 1500
  }, (res) => {
    // response handled silently
  });

  req.on('error', () => {
    // Silent on connection failure when backend is spinning up
  });

  req.write(data);
  req.end();
}

/**
 * Main simulation tick
 */
function tick() {
  tickCount++;

  NODES.forEach((node) => {
    const telemetry = generateReadings(node, currentScenario, tickCount);
    const topic = `dinoflow/${telemetry.site_id}/${telemetry.zone_id}/${telemetry.node_id}/telemetry`;
    const payloadStr = JSON.stringify(telemetry);

    if (mqttConnected && client) {
      client.publish(topic, payloadStr, { qos: 0 }, (err) => {
        if (err) sendHttpFallback(telemetry);
      });
    } else {
      sendHttpFallback(telemetry);
    }
  });

  const acometidaData = generateReadings(NODES[0], currentScenario, tickCount);
  process.stdout.write(
    `\r[Tick #${tickCount}] Scenario: ${currentScenario.padEnd(20)} | Flow: ${acometidaData.flow_lpm.toFixed(1)} L/min | Pres: ${acometidaData.pressure_bar.toFixed(2)} bar | Temp: ${acometidaData.temperature_c.toFixed(1)}°C | Transport: ${mqttConnected ? 'MQTT' : 'HTTP'}`
  );
}

// Start simulation loop
const timer = setInterval(tick, publishIntervalMs);

/**
 * Lightweight HTTP server to allow the Frontend and API to switch scenarios interactively
 */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${controlPort}`);

  if (url.pathname === '/scenario' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.scenario) {
          currentScenario = parsed.scenario;
          console.log(`\n\n🎯 SCENARIO CHANGED TO: [${currentScenario.toUpperCase()}] via Remote Control`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, scenario: currentScenario }));
          return;
        }
      } catch (e) {}
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON or missing scenario' }));
    });
  } else if (url.pathname === '/scenario' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      scenario: currentScenario,
      available_scenarios: [
        'normal',
        'fuga_lenta',
        'fuga_grande',
        'falta_agua',
        'baja_presion',
        'congelamiento',
        'sobrecalentamiento',
        'consumo_anomalo_nocturno'
      ],
      transport: mqttConnected ? 'MQTT' : 'HTTP',
      interval_ms: publishIntervalMs
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(controlPort, () => {
  console.log(`🕹️  Simulator Remote Control API listening on http://localhost:${controlPort}/scenario`);
  console.log('💡 Keyboard shortcuts: press [1] Normal, [2] Fuga Lenta, [3] Fuga Grande, [4] Falta Agua, [5] Baja Presión, [6] Congelar, [7] Nocturno, [q] Quit\n');
});

// Setup stdin for terminal interaction
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => {
    if (key === '1') currentScenario = 'normal';
    else if (key === '2') currentScenario = 'fuga_lenta';
    else if (key === '3') currentScenario = 'fuga_grande';
    else if (key === '4') currentScenario = 'falta_agua';
    else if (key === '5') currentScenario = 'baja_presion';
    else if (key === '6') currentScenario = 'congelamiento';
    else if (key === '7') currentScenario = 'consumo_anomalo_nocturno';
    else if (key === 'q' || key === '\u0003') {
      console.log('\nExiting simulator...');
      process.exit();
    }
    if (['1','2','3','4','5','6','7'].includes(key)) {
      console.log(`\n🎮 Interactive Key: Switched scenario to [${currentScenario.toUpperCase()}]`);
    }
  });
}

/**
 * Baseline Engine
 * Maintains running statistical profile (mean & variance) for flow and pressure
 * indexed by zone, day of week, and hour of day.
 */

class BaselineEngine {
  constructor() {
    // Key: `${zone_id}-${dayOfWeek}-${hourOfDay}`
    this.table = new Map();
    this.initDefaultBaselines();
  }

  initDefaultBaselines() {
    const zones = ['zone-acometida', 'zone-cocina-pb', 'zone-jardin', 'zone-planta-alta'];
    for (const zone of zones) {
      for (let day = 0; day <= 6; day++) {
        for (let hour = 0; hour <= 23; hour++) {
          let avgFlow = 0.0;
          let maxFlow = 2.0;

          if (hour >= 6 && hour <= 9) {
            avgFlow = 8.0;
            maxFlow = 22.0;
          } else if (hour >= 13 && hour <= 15) {
            avgFlow = 6.0;
            maxFlow = 18.0;
          } else if (hour >= 19 && hour <= 22) {
            avgFlow = 7.0;
            maxFlow = 20.0;
          } else if (hour >= 1 && hour <= 5) {
            avgFlow = 0.02;
            maxFlow = 0.3; // Quiet nocturnal threshold
          } else {
            avgFlow = 2.0;
            maxFlow = 10.0;
          }

          this.setBaseline(zone, day, hour, {
            avgFlow,
            maxFlow,
            minPressure: 1.2,
            maxPressure: 3.5,
            samples: 50
          });
        }
      }
    }
  }

  getKey(zoneId, day, hour) {
    return `${zoneId}:${day}:${hour}`;
  }

  setBaseline(zoneId, day, hour, profile) {
    this.table.set(this.getKey(zoneId, day, hour), profile);
  }

  getBaseline(zoneId, timestamp) {
    const d = new Date(timestamp);
    const day = d.getDay();
    const hour = d.getHours();
    const key = this.getKey(zoneId, day, hour);
    return this.table.get(key) || {
      avgFlow: 2.0,
      maxFlow: 15.0,
      minPressure: 1.0,
      maxPressure: 3.5,
      samples: 1
    };
  }

  updateWithSample(reading) {
    const d = new Date(reading.time);
    const day = d.getDay();
    const hour = d.getHours();
    const key = this.getKey(reading.zone_id, day, hour);
    const existing = this.getBaseline(reading.zone_id, reading.time);

    // Online running average update
    const n = existing.samples + 1;
    const newAvgFlow = existing.avgFlow + (reading.flow_lpm - existing.avgFlow) / n;

    this.table.set(key, {
      avgFlow: Math.round(newAvgFlow * 100) / 100,
      maxFlow: Math.max(existing.maxFlow, reading.flow_lpm * 1.2),
      minPressure: existing.minPressure,
      maxPressure: existing.maxPressure,
      samples: n
    });
  }
}

module.exports = new BaselineEngine();

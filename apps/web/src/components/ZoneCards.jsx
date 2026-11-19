import React from 'react';
import { Droplet, Gauge, Thermometer, Wifi, AlertTriangle } from 'lucide-react';

export default function ZoneCards({ zones = [], latestReadings = [], onSelectZone }) {
  const readingMap = new Map();
  latestReadings.forEach(r => readingMap.set(r.zone_id, r));

  const defaultZones = [
    { id: 'zone-acometida', name: 'Acometida Principal', desc: 'Entrada municipal y medidor de calle', is_critical: true },
    { id: 'zone-cocina-pb', name: 'Cocina & Baño PB', desc: 'Distribuidor y servicios de planta baja', is_critical: false },
    { id: 'zone-jardin', name: 'Jardín & Riego', desc: 'Línea exterior y aspersores', is_critical: false },
    { id: 'zone-planta-alta', name: 'Tinaco & Baños PA', desc: 'Almacenamiento y regaderas superiores', is_critical: true }
  ];

  const displayZones = zones.length > 0 ? zones : defaultZones;

  return (
    <div className="max-w-7xl mx-auto my-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Zonas Hidráulicas Monitoreadas
        </h3>
        <span className="text-xs text-slate-400">4 Nodos Activos</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayZones.map((zone) => {
          const reading = readingMap.get(zone.id) || {
            flow_lpm: 0,
            pressure_bar: 2.2,
            temperature_c: 21.0,
            rssi: -58
          };

          const isHighFlow = reading.flow_lpm > 20;
          const isLowPressure = reading.pressure_bar < 0.8;

          return (
            <div 
              key={zone.id}
              onClick={() => onSelectZone && onSelectZone(zone.id)}
              className="glass-card p-4 cursor-pointer hover:border-cyan-400/50 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                    {zone.name}
                    {zone.is_critical && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-950 border border-rose-500/40 text-rose-300">
                        Crítica
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{zone.description || zone.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{reading.rssi || -60}dB</span>
                </div>
              </div>

              {/* 3 Metric Gauges in Zone */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800">
                
                {/* Flow */}
                <div className="text-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-center gap-0.5 text-slate-400 text-[10px] mb-0.5">
                    <Droplet className="w-3 h-3 text-cyan-400" />
                    <span>Flujo</span>
                  </div>
                  <span className={`text-xs font-bold ${isHighFlow ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
                    {reading.flow_lpm}
                  </span>
                  <span className="text-[9px] text-slate-500 block">L/min</span>
                </div>

                {/* Pressure */}
                <div className="text-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-center gap-0.5 text-slate-400 text-[10px] mb-0.5">
                    <Gauge className="w-3 h-3 text-emerald-400" />
                    <span>Presión</span>
                  </div>
                  <span className={`text-xs font-bold ${isLowPressure ? 'text-rose-400' : 'text-slate-100'}`}>
                    {reading.pressure_bar}
                  </span>
                  <span className="text-[9px] text-slate-500 block">bar</span>
                </div>

                {/* Temp */}
                <div className="text-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-center gap-0.5 text-slate-400 text-[10px] mb-0.5">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    <span>Temp</span>
                  </div>
                  <span className="text-xs font-bold text-slate-100">
                    {reading.temperature_c}°
                  </span>
                  <span className="text-[9px] text-slate-500 block">Celsius</span>
                </div>

              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

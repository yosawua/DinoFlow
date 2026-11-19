import React, { useState } from 'react';
import { Layers, Droplets, AlertTriangle, ShieldCheck, Flame, Radio } from 'lucide-react';

export default function HydraulicMap({ latestReadings = [], activeAlerts = [], onSelectZone }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Index readings by node_id
  const readingMap = new Map();
  latestReadings.forEach(r => readingMap.set(r.node_id, r));

  const acometida = readingMap.get('node-acometida-01') || { flow_lpm: 0, pressure_bar: 2.5, temperature_c: 20.5 };
  const cocina = readingMap.get('node-cocina-01') || { flow_lpm: 0, pressure_bar: 2.3, temperature_c: 21.0 };
  const jardin = readingMap.get('node-jardin-01') || { flow_lpm: 0, pressure_bar: 2.1, temperature_c: 23.0 };
  const tinaco = readingMap.get('node-tinaco-01') || { flow_lpm: 0, pressure_bar: 1.8, temperature_c: 22.0 };

  // Check if pipe rupture or delta leak is active
  const hasRupture = activeAlerts.some(a => a.rule_id === 'rule-caida-presion-ruptura');
  const hasDeltaLeak = activeAlerts.some(a => a.rule_id === 'rule-fuga-tramo-delta');
  const hasNocturnalLeak = activeAlerts.some(a => a.rule_id === 'rule-fuga-nocturna');
  const hasSupplyCut = activeAlerts.some(a => a.rule_id === 'rule-falta-agua');

  // Pipe colors based on anomaly status
  const mainPipeColor = hasRupture || hasDeltaLeak ? '#ef4444' : '#0284c7';
  const mainPipeAnim = hasRupture ? 'pipe-water-urgent' : (acometida.flow_lpm > 0.1 ? 'pipe-water-active' : '');

  return (
    <div className="glass-card p-5 max-w-7xl mx-auto my-4 overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Esquema Hidráulico Digital de la Instalación
            </h2>
            <p className="text-xs text-slate-400">
              Topología de tuberías, balance de caudal en tramos y telemetría por zona
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Flujo Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Ruptura / Pérdida en Tramo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
            <span>Reposo</span>
          </div>
        </div>
      </div>

      {/* Interactive Blueprint Canvas */}
      <div className="relative w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-4 overflow-x-auto min-h-[360px] flex items-center justify-center">
        
        <svg viewBox="0 0 920 340" className="w-full max-w-[900px] h-auto select-none">
          <defs>
            <linearGradient id="pipeBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0284c7" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
            <linearGradient id="pipeDanger" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#dc2626" />
              <stop offset="100%" stop-color="#f87171" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Blueprint Lines */}
          <g opacity="0.12" stroke="#38bdf8" strokeWidth="0.5">
            <line x1="0" y1="60" x2="920" y2="60" />
            <line x1="0" y1="170" x2="920" y2="170" />
            <line x1="0" y1="280" x2="920" y2="280" />
            <line x1="160" y1="0" x2="160" y2="340" />
            <line x1="420" y1="0" x2="420" y2="340" />
            <line x1="680" y1="0" x2="680" y2="340" />
          </g>

          {/* ======================================================== */}
          {/* PIPELINE NETWORK (TUBERÍAS) */}
          {/* ======================================================== */}
          
          {/* 1. Tubería de Acometida (Municipal to Meter) */}
          <path d="M 40 170 L 150 170" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" />
          <path d="M 40 170 L 150 170" stroke="#bae6fd" strokeWidth="3" className="pipe-water-active" strokeLinecap="round" />

          {/* 2. Tramo Central Monitoreado: Acometida -> Distribuidor Cocina */}
          <path 
            d="M 180 170 L 420 170" 
            stroke={mainPipeColor} 
            strokeWidth="10" 
            strokeLinecap="round" 
            filter="url(#neonGlow)"
          />
          <path 
            d="M 180 170 L 420 170" 
            stroke={hasRupture ? '#fecaca' : '#e0f2fe'} 
            strokeWidth="4" 
            className={mainPipeAnim} 
            strokeLinecap="round" 
          />

          {/* Leak Hazard Alert indicator on intermediate segment */}
          {(hasRupture || hasDeltaLeak) && (
            <g transform="translate(290, 140)">
              <circle cx="15" cy="15" r="22" fill="#ef4444" opacity="0.25" className="animate-ping" />
              <rect x="0" y="0" width="30" height="30" rx="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
              <text x="15" y="20" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">💥</text>
              <rect x="-35" y="36" width="100" height="18" rx="4" fill="#1e1e24" stroke="#ef4444" strokeWidth="1" />
              <text x="15" y="49" fill="#fca5a5" fontSize="9" fontWeight="bold" textAnchor="middle">
                {hasRupture ? 'RUPTURA MASIVA' : 'FUGA EN TRAMO'}
              </text>
            </g>
          )}

          {/* 3. Ramal hacia Jardín (Abajo) */}
          <path d="M 420 170 L 420 270 L 640 270" stroke="#0284c7" strokeWidth="7" fill="none" />
          <path d="M 420 170 L 420 270 L 640 270" stroke="#bae6fd" strokeWidth="2.5" className="pipe-water-active" fill="none" />

          {/* 4. Ramal hacia Cocina PB (Centro-Derecha) */}
          <path d="M 420 170 L 640 170" stroke="#0284c7" strokeWidth="8" fill="none" />
          <path d="M 420 170 L 640 170" stroke="#bae6fd" strokeWidth="3" className="pipe-water-active" fill="none" />

          {/* 5. Ramal Subida a Tinaco / PA (Arriba) */}
          <path d="M 420 170 L 420 70 L 640 70" stroke="#0284c7" strokeWidth="7" fill="none" />
          <path d="M 420 170 L 420 70 L 640 70" stroke="#bae6fd" strokeWidth="2.5" className="pipe-water-active" fill="none" />


          {/* ======================================================== */}
          {/* NODES & SENSORS TELEMETRY OVERLAYS */}
          {/* ======================================================== */}

          {/* Municipal Inflow Source */}
          <g transform="translate(20, 145)">
            <rect width="65" height="50" rx="10" fill="#0b1736" stroke="#1e3a5f" strokeWidth="1.5" />
            <text x="32" y="24" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">RED CALLE</text>
            <text x="32" y="40" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">MUNICIPAL</text>
          </g>

          {/* NODE 1: ACOMETIDA PRINCIPAL */}
          <g 
            transform="translate(145, 120)" 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => onSelectZone && onSelectZone('zone-acometida')}
          >
            <rect width="130" height="96" rx="14" fill="#0f1f3d" stroke={hasRupture ? '#ef4444' : '#0284c7'} strokeWidth="2" filter="url(#neonGlow)" />
            <circle cx="20" cy="22" r="6" fill="#38bdf8" />
            <text x="34" y="25" fill="#f8fafc" fontSize="11" fontWeight="bold">Nodo Acometida</text>
            <text x="34" y="37" fill="#64748b" fontSize="8">node-acometida-01 (WiFi)</text>

            {/* Readings */}
            <rect x="12" y="46" width="106" height="42" rx="8" fill="#081026" stroke="#1e293b" />
            <text x="20" y="60" fill="#94a3b8" fontSize="9">Flujo Q_in:</text>
            <text x="110" y="60" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{acometida.flow_lpm} L/min</text>
            
            <text x="20" y="72" fill="#94a3b8" fontSize="9">Presión:</text>
            <text x="110" y="72" fill={acometida.pressure_bar < 0.8 ? '#f87171' : '#34d399'} fontSize="10" fontWeight="bold" textAnchor="end">{acometida.pressure_bar} bar</text>

            <text x="20" y="83" fill="#94a3b8" fontSize="8">Temp:</text>
            <text x="110" y="83" fill="#94a3b8" fontSize="8" textAnchor="end">{acometida.temperature_c}°C</text>
          </g>

          {/* Hydraulic Check & Filter Point */}
          <g transform="translate(395, 150)">
            <circle cx="25" cy="20" r="14" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" />
            <text x="25" y="24" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">CHECK</text>
          </g>

          {/* NODE 2: TINACO PLANTA ALTA */}
          <g 
            transform="translate(660, 25)" 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => onSelectZone && onSelectZone('zone-planta-alta')}
          >
            <rect width="130" height="90" rx="14" fill="#0f1f3d" stroke="#0284c7" strokeWidth="1.5" />
            <circle cx="20" cy="22" r="6" fill="#0ea5e9" />
            <text x="34" y="25" fill="#f8fafc" fontSize="11" fontWeight="bold">Tinaco / P. Alta</text>
            <text x="34" y="37" fill="#64748b" fontSize="8">node-tinaco-01 (RS-485)</text>

            <rect x="12" y="44" width="106" height="38" rx="8" fill="#081026" stroke="#1e293b" />
            <text x="20" y="58" fill="#94a3b8" fontSize="9">Flujo:</text>
            <text x="110" y="58" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{tinaco.flow_lpm} L/min</text>
            <text x="20" y="72" fill="#94a3b8" fontSize="9">Presión:</text>
            <text x="110" y="72" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="end">{tinaco.pressure_bar} bar</text>
          </g>

          {/* NODE 3: COCINA Y MEDIO BAÑO PB */}
          <g 
            transform="translate(660, 125)" 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => onSelectZone && onSelectZone('zone-cocina-pb')}
          >
            <rect width="130" height="90" rx="14" fill="#0f1f3d" stroke="#0284c7" strokeWidth="1.5" />
            <circle cx="20" cy="22" r="6" fill="#38bdf8" />
            <text x="34" y="25" fill="#f8fafc" fontSize="11" fontWeight="bold">Cocina & Baño PB</text>
            <text x="34" y="37" fill="#64748b" fontSize="8">node-cocina-01 (WiFi)</text>

            <rect x="12" y="44" width="106" height="38" rx="8" fill="#081026" stroke="#1e293b" />
            <text x="20" y="58" fill="#94a3b8" fontSize="9">Flujo Q_out:</text>
            <text x="110" y="58" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{cocina.flow_lpm} L/min</text>
            <text x="20" y="72" fill="#94a3b8" fontSize="9">Presión:</text>
            <text x="110" y="72" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="end">{cocina.pressure_bar} bar</text>
          </g>

          {/* NODE 4: RIEGO JARDÍN */}
          <g 
            transform="translate(660, 225)" 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => onSelectZone && onSelectZone('zone-jardin')}
          >
            <rect width="130" height="90" rx="14" fill="#0f1f3d" stroke="#0284c7" strokeWidth="1.5" />
            <circle cx="20" cy="22" r="6" fill="#10b981" />
            <text x="34" y="25" fill="#f8fafc" fontSize="11" fontWeight="bold">Jardín & Riego</text>
            <text x="34" y="37" fill="#64748b" fontSize="8">node-jardin-01 (WiFi)</text>

            <rect x="12" y="44" width="106" height="38" rx="8" fill="#081026" stroke="#1e293b" />
            <text x="20" y="58" fill="#94a3b8" fontSize="9">Flujo:</text>
            <text x="110" y="58" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="end">{jardin.flow_lpm} L/min</text>
            <text x="20" y="72" fill="#94a3b8" fontSize="9">Presión:</text>
            <text x="110" y="72" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="end">{jardin.pressure_bar} bar</text>
          </g>

        </svg>

      </div>
    </div>
  );
}

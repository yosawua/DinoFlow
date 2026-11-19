import React from 'react';
import { TrendingUp, Gauge, Waves } from 'lucide-react';

export default function LiveCharts({ history = [], latestReadings = [] }) {
  // Use last 25 readings for smooth chart rendering
  const points = history.slice(-25);

  // SVG dimensions
  const width = 500;
  const height = 180;
  const pad = 30;

  // Render SVG Sparkline for Flow Rate
  const maxFlow = Math.max(30, ...points.map(p => p.flow_lpm || 0));
  const flowPath = points.length > 1
    ? points.map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (width - pad * 2);
        const y = height - pad - ((p.flow_lpm || 0) / maxFlow) * (height - pad * 2);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : `M ${pad} ${height - pad} L ${width - pad} ${height - pad}`;

  // Render SVG Sparkline for Pressure
  const maxPres = 4.5;
  const presPath = points.length > 1
    ? points.map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (width - pad * 2);
        const y = height - pad - (Math.min(maxPres, p.pressure_bar || 0) / maxPres) * (height - pad * 2);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : `M ${pad} ${height - pad} L ${width - pad} ${height - pad}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto my-4">
      
      {/* Chart 1: Flow Rate vs Baseline */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Caudal en Tiempo Real (L/min)</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300">
            vs Línea Base
          </span>
        </div>

        <div className="w-full h-[180px] bg-slate-950/70 rounded-xl p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Baseline threshold dotted line */}
            <line 
              x1={pad} 
              y1={height - pad - (15 / maxFlow) * (height - pad * 2)} 
              x2={width - pad} 
              y2={height - pad - (15 / maxFlow) * (height - pad * 2)} 
              stroke="#64748b" 
              strokeDasharray="4 4" 
              strokeWidth="1.5" 
            />
            <text x={width - pad} y={height - pad - (15 / maxFlow) * (height - pad * 2) - 4} fill="#64748b" fontSize="9" textAnchor="end">
              Umbral Normal (15 L/min)
            </text>

            {/* Grid Line */}
            <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#1e293b" strokeWidth="1" />

            {/* Flow Curve */}
            <path d={flowPath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Current Value Pill */}
            {points.length > 0 && (
              <circle 
                cx={width - pad} 
                cy={height - pad - ((points[points.length - 1].flow_lpm || 0) / maxFlow) * (height - pad * 2)} 
                r="4.5" 
                fill="#38bdf8" 
                stroke="#ffffff" 
                strokeWidth="1.5" 
              />
            )}
          </svg>
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 px-1">
          <span>Lecturas anteriores</span>
          <span>Último valor: <strong className="text-cyan-300">{points.length > 0 ? (points[points.length - 1].flow_lpm || 0) : 0} L/min</strong></span>
        </div>
      </div>

      {/* Chart 2: Pressure vs Safe Range */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Presión Hidráulica (bar)</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300">
            Rango Seguro (1.0 - 4.5 bar)
          </span>
        </div>

        <div className="w-full h-[180px] bg-slate-950/70 rounded-xl p-2 border border-slate-800/80">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Low Pressure Threshold */}
            <line 
              x1={pad} 
              y1={height - pad - (0.8 / maxPres) * (height - pad * 2)} 
              x2={width - pad} 
              y2={height - pad - (0.8 / maxPres) * (height - pad * 2)} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              strokeWidth="1.5" 
            />
            <text x={pad + 4} y={height - pad - (0.8 / maxPres) * (height - pad * 2) - 4} fill="#ef4444" fontSize="9">
              Límite Baja Presión (0.8 bar)
            </text>

            {/* Pressure Curve */}
            <path d={presPath} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Current Value Pill */}
            {points.length > 0 && (
              <circle 
                cx={width - pad} 
                cy={height - pad - (Math.min(maxPres, points[points.length - 1].pressure_bar || 0) / maxPres) * (height - pad * 2)} 
                r="4.5" 
                fill="#34d399" 
                stroke="#ffffff" 
                strokeWidth="1.5" 
              />
            )}
          </svg>
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 px-1">
          <span>Lecturas anteriores</span>
          <span>Último valor: <strong className="text-emerald-300">{points.length > 0 ? (points[points.length - 1].pressure_bar || 0) : 0} bar</strong></span>
        </div>
      </div>

    </div>
  );
}

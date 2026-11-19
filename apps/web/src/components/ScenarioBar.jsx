import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Flame, Droplets, Snowflake, Moon, Ban, RefreshCw } from 'lucide-react';

const SCENARIOS = [
  { id: 'normal', label: 'Normal (Flujo Doméstico)', icon: Droplets, color: 'hover:border-emerald-500 hover:text-emerald-300', bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50' },
  { id: 'fuga_lenta', label: 'Fuga Lenta / Goteo (1.4 L/min)', icon: Droplets, color: 'hover:border-amber-500 hover:text-amber-300', bg: 'bg-amber-950/40 text-amber-300 border-amber-500/50' },
  { id: 'fuga_grande', label: 'Ruptura Mayor (36 L/min)', icon: Flame, color: 'hover:border-rose-500 hover:text-rose-300', bg: 'bg-rose-950/40 text-rose-300 border-rose-500/50' },
  { id: 'falta_agua', label: 'Corte de Suministro (0 bar)', icon: Ban, color: 'hover:border-slate-500 hover:text-slate-300', bg: 'bg-slate-900 text-slate-300 border-slate-700' },
  { id: 'baja_presion', label: 'Baja Presión (< 0.8 bar)', icon: AlertTriangle, color: 'hover:border-amber-400 hover:text-amber-300', bg: 'bg-amber-950/30 text-amber-200 border-amber-500/40' },
  { id: 'congelamiento', label: 'Helada (-2.8 °C)', icon: Snowflake, color: 'hover:border-cyan-400 hover:text-cyan-300', bg: 'bg-cyan-950/40 text-cyan-200 border-cyan-400/50' },
  { id: 'consumo_anomalo_nocturno', label: 'Consumo Madrugada (15 L/min)', icon: Moon, color: 'hover:border-indigo-400 hover:text-indigo-300', bg: 'bg-indigo-950/40 text-indigo-200 border-indigo-400/50' }
];

export default function ScenarioBar({ currentScenario, onSelectScenario }) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (id) => {
    setLoading(true);
    await onSelectScenario(id);
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <div className="w-full bg-slate-900/60 border-y border-slate-800/80 px-4 py-2.5 backdrop-blur-sm overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-w-max">
        
        {/* Scenario Bar Label */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
          <span>Simulador Hidráulico:</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const isActive = currentScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleSelect(sc.id)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? sc.bg + ' ring-2 ring-cyan-400/40 font-bold scale-[1.02]'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:bg-slate-800/80 ' + sc.color
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sc.label}</span>
                {isActive && <CheckCircle2 className="w-3 h-3 text-cyan-400 ml-0.5" />}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { Activity, Droplets, AlertOctagon, Gauge, TrendingDown, DollarSign } from 'lucide-react';

export default function MetricsCards({ metrics, latestReadings }) {
  const m = metrics || {
    healthIndex: 100,
    totalConsumptionLiters: 450,
    totalCost: 11.47,
    waterLostLiters: 0,
    financialLossCost: 0,
    activeAlertsCount: 0
  };

  // Average pressure across all reporting nodes
  let avgPressure = 2.4;
  if (latestReadings && latestReadings.length > 0) {
    const sum = latestReadings.reduce((acc, r) => acc + (r.pressure_bar || 0), 0);
    avgPressure = Math.round((sum / latestReadings.length) * 100) / 100;
  }

  const healthColor = m.healthIndex > 85 ? 'text-emerald-400' : m.healthIndex > 50 ? 'text-amber-400' : 'text-rose-400';
  const healthBg = m.healthIndex > 85 ? 'bg-emerald-500/10 border-emerald-500/20' : m.healthIndex > 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto my-4">
      
      {/* 1. Salud del Sistema */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salud de la Red</span>
          <div className={`p-2 rounded-xl ${healthBg}`}>
            <Activity className={`w-4 h-4 ${healthColor}`} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold tracking-tight ${healthColor}`}>
            {m.healthIndex}%
          </span>
          <span className="text-xs font-medium text-slate-400">
            {m.healthIndex > 85 ? 'Óptima' : m.healthIndex > 50 ? 'Atención' : 'Crítica'}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              m.healthIndex > 85 ? 'bg-emerald-400' : m.healthIndex > 50 ? 'bg-amber-400' : 'bg-rose-500'
            }`}
            style={{ width: `${m.healthIndex}%` }}
          />
        </div>
      </div>

      {/* 2. Consumo Diario Acumulado */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consumo de Hoy</span>
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {m.totalConsumptionLiters.toLocaleString()}
          </span>
          <span className="text-xs font-medium text-sky-400">Litros</span>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
          <span>Equivalente: ${(m.totalCost || 0).toFixed(2)} MXN</span>
          <span className="text-slate-600">•</span>
          <span>{(m.totalConsumptionLiters / 1000).toFixed(2)} m³</span>
        </p>
      </div>

      {/* 3. Agua y Dinero Perdidos por Fugas */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pérdida por Fugas</span>
          <div className={`p-2 rounded-xl ${m.waterLostLiters > 0 ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-slate-800'}`}>
            <AlertOctagon className={`w-4 h-4 ${m.waterLostLiters > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold tracking-tight ${m.waterLostLiters > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
            {m.waterLostLiters.toLocaleString()}
          </span>
          <span className="text-xs font-medium text-slate-400">Litros</span>
        </div>
        <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${m.financialLossCost > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
          <DollarSign className="w-3.5 h-3.5" />
          <span>{m.financialLossCost > 0 ? `Desperdicio: $${m.financialLossCost} MXN` : 'Sin fugas detectadas'}</span>
        </p>
      </div>

      {/* 4. Presión Media Operativa */}
      <div className="glass-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Presión de Red</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {avgPressure}
          </span>
          <span className="text-xs font-medium text-cyan-400">bar</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Rango seguro: <span className="text-slate-200">1.2 – 3.5 bar</span>
        </p>
      </div>

    </div>
  );
}

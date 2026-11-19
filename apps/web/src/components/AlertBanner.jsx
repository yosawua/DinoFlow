import React from 'react';
import { AlertCircle, AlertTriangle, Info, Volume2, Sparkles, CheckCircle2, DollarSign, Clock } from 'lucide-react';

export default function AlertBanner({
  activeAlert,
  onResolve,
  onOpenAi,
  onPlayVoice
}) {
  if (!activeAlert) return null;

  const isUrgent = activeAlert.severity === 'urgente';
  const isEarlyWarning = activeAlert.severity === 'alerta_temprana';

  const bgStyle = isUrgent
    ? 'bg-rose-950/80 border-rose-500/80 text-rose-100 alert-pulse-urgent'
    : isEarlyWarning
    ? 'bg-amber-950/80 border-amber-500/80 text-amber-100'
    : 'bg-sky-950/80 border-sky-500/80 text-sky-100';

  const badgeStyle = isUrgent
    ? 'bg-rose-500 text-white'
    : isEarlyWarning
    ? 'bg-amber-500 text-slate-950'
    : 'bg-sky-500 text-slate-950';

  return (
    <div className={`w-full max-w-7xl mx-auto my-4 p-4 rounded-2xl border ${bgStyle} backdrop-blur-md shadow-2xl transition-all`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Icon & Alert Details */}
        <div className="flex items-start gap-3.5 flex-1">
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 mt-0.5">
            {isUrgent ? (
              <AlertCircle className="w-6 h-6 text-rose-400 animate-bounce" />
            ) : isEarlyWarning ? (
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            ) : (
              <Info className="w-6 h-6 text-sky-400" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider ${badgeStyle}`}>
                {activeAlert.severity.replace('_', ' ')}
              </span>
              <h3 className="font-bold text-base md:text-lg tracking-tight text-white">
                {activeAlert.title}
              </h3>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(activeAlert.created_at).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed mb-2">
              {activeAlert.description}
            </p>

            {/* Impact Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-cyan-300">
                Pérdida estimada: <span className="font-bold text-white">{activeAlert.estimated_loss_liters} Litros</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-emerald-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Costo estimado: <span className="font-bold text-white">${activeAlert.estimated_loss_cost} MXN</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-amber-300">
                Métrica: <span className="font-bold text-white">{activeAlert.metric_value} {activeAlert.unit}</span> (Umbral: {activeAlert.threshold_value})
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          
          {/* Spoken Alert Audio */}
          <button
            onClick={() => onPlayVoice(activeAlert)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-sm"
            title="Escuchar locución de alerta hablada"
          >
            <Volume2 className="w-4 h-4 text-cyan-300" />
            <span>Escuchar Alerta</span>
          </button>

          {/* Gemini AI Explanation */}
          <button
            onClick={() => onOpenAi(activeAlert)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-500/25"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Diagnóstico IA</span>
          </button>

          {/* Resolve Alert */}
          <button
            onClick={() => onResolve(activeAlert.id)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Resolver</span>
          </button>

        </div>

      </div>
    </div>
  );
}

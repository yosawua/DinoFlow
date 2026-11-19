import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Sparkles, Volume2, Clock } from 'lucide-react';

export default function AlertsList({
  alerts = [],
  onResolveAlert,
  onOpenAi,
  onPlayVoice
}) {
  return (
    <div className="glass-card p-5 max-w-7xl mx-auto my-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Historial de Eventos y Detección de Fugas
          </h3>
          <p className="text-xs text-slate-400">
            Registro cronológico con clasificación de severidad y balance económico
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
          {alerts.length} eventos
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
          <p>No hay alertas activas ni pendientes. La red hidráulica se encuentra en estado óptimo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isUrgent = alert.severity === 'urgente';
            const isEarly = alert.severity === 'alerta_temprana';
            const isResolved = alert.status === 'resuelta';

            const borderCol = isResolved 
              ? 'border-slate-800 opacity-60' 
              : isUrgent 
              ? 'border-rose-500/60 bg-rose-950/20' 
              : isEarly 
              ? 'border-amber-500/60 bg-amber-950/20' 
              : 'border-sky-500/60 bg-sky-950/20';

            const badgeBg = isResolved
              ? 'bg-slate-700 text-slate-300'
              : isUrgent
              ? 'bg-rose-500 text-white'
              : isEarly
              ? 'bg-amber-500 text-slate-950'
              : 'bg-sky-500 text-slate-950';

            return (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border ${borderCol} flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all`}
              >
                {/* Left Details */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-black/40 mt-0.5">
                    {isUrgent ? (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    ) : isEarly ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 text-sky-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                        {alert.severity.replace('_', ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {alert.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                      {isResolved && (
                        <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-semibold">
                          Resuelta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mb-1.5">{alert.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>Pérdida: <strong className="text-cyan-300">{alert.estimated_loss_liters || 0} L</strong></span>
                      <span>•</span>
                      <span>Impacto: <strong className="text-emerald-300">${alert.estimated_loss_cost || 0} MXN</strong></span>
                      <span>•</span>
                      <span>Zona: <strong className="text-slate-300">{alert.zone_id}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => onPlayVoice(alert)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors"
                    title="Reproducir locución"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenAi(alert)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Diagnóstico IA</span>
                  </button>

                  {!isResolved && (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Resolver</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

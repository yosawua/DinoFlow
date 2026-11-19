import React from 'react';
import { X, Sparkles, AlertTriangle, CheckSquare, ShieldAlert, Volume2, Bot } from 'lucide-react';

export default function AiModal({ isOpen, onClose, data, onSpeak }) {
  if (!isOpen || !data) return null;

  const isAlertReport = Boolean(data.alert);
  const title = isAlertReport ? `Diagnóstico IA: ${data.alert.title}` : 'Resumen Ejecutivo DinoFlow (Gemini AI)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-2xl bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-slate-950">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  {data.source === 'gemini' ? 'Gemini 1.5 Flash' : 'Motor Experto Local'}
                </span>
                <span className="text-xs text-slate-400">Análisis Inteligente</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">{title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 text-slate-200">
          
          {/* Main Explanation */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-sm leading-relaxed">
            <p className="font-semibold text-cyan-200 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              ¿Qué está pasando?
            </p>
            <p className="text-slate-200">{data.explanation || data.summary}</p>
          </div>

          {/* Probable Causes */}
          {data.probable_causes && data.probable_causes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Causas Físicas Probables:
              </h4>
              <ul className="space-y-1.5">
                {data.probable_causes.map((cause, i) => (
                  <li key={i} className="text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions Checklist */}
          {data.recommended_actions && data.recommended_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                Plan de Acción Inmediato (Checklist):
              </h4>
              <div className="space-y-1.5">
                {data.recommended_actions.map((act, i) => (
                  <div key={i} className="text-xs bg-slate-950/60 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-200/90 flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saving Tips (if daily summary) */}
          {data.saving_tips && data.saving_tips.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                Consejos de Ahorro y Eficiencia:
              </h4>
              <div className="space-y-1.5">
                {data.saving_tips.map((tip, i) => (
                  <div key={i} className="text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">✓</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {data.risk_assessment && (
            <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs">
              <span className="font-bold text-rose-300 block mb-0.5 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Evaluación de Riesgo:
              </span>
              <p className="text-slate-300">{data.risk_assessment}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => onSpeak && onSpeak(data.explanation || data.summary)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span>Escuchar Diagnóstico</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}

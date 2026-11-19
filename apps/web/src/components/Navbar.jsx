import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Wrench, Sparkles, Wifi, WifiOff, ShieldCheck } from 'lucide-react';

export default function Navbar({
  darkMode,
  setDarkMode,
  isMuted,
  toggleMute,
  connectionStatus,
  onOpenInstaller,
  onOpenAiReport
}) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-sky-900/30 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Mascot */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <img 
              src="/dinoflow-logo.svg" 
              alt="DinoFlow Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                DinoFlow
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                Local-First
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Monitoreo Hidráulico Inteligente • Residencia Las Palmas (Demo)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/90 border border-slate-800 text-slate-300">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden md:inline">En Vivo (WS)</span>
              </>
            ) : connectionStatus === 'sse_connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="hidden md:inline">En Vivo (SSE)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="hidden md:inline">Local Cache</span>
              </>
            )}
          </div>

          {/* AI Executive Report */}
          <button
            onClick={onOpenAiReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/40 text-cyan-200 transition-all shadow-sm"
            title="Generar Resumen Ejecutivo con Gemini AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Reporte IA</span>
          </button>

          {/* Installer Mode Button */}
          <button
            onClick={onOpenInstaller}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all"
            title="Asistente para Plomeros y Técnicos Instaladores"
          >
            <Wrench className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Modo Instalador</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title={isMuted ? 'Activar Alertas de Audio' : 'Silenciar Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Cambiar tema visual"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400" />
            )}
          </button>

        </div>
      </div>
    </header>
  );
}

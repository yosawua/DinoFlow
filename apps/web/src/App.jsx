import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ScenarioBar from './components/ScenarioBar';
import AlertBanner from './components/AlertBanner';
import MetricsCards from './components/MetricsCards';
import HydraulicMap from './components/HydraulicMap';
import ZoneCards from './components/ZoneCards';
import LiveCharts from './components/LiveCharts';
import AlertsList from './components/AlertsList';
import AiModal from './components/AiModal';
import InstallerWizard from './components/InstallerWizard';
import { api } from './services/api';
import { audioService } from './services/audio';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [currentScenario, setCurrentScenario] = useState('normal');

  const [metrics, setMetrics] = useState(null);
  const [latestReadings, setLatestReadings] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);

  // Modals
  const [installerOpen, setInstallerOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);

  // Audio mute toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioService.setMuted(next);
  };

  // Initial Data Fetch
  const loadInitialData = useCallback(async () => {
    try {
      const [m, readings, altList] = await Promise.all([
        api.getSummaryMetrics(),
        api.getLatestReadings(),
        api.getAlerts()
      ]);
      setMetrics(m);
      setLatestReadings(readings || []);
      setAlerts(altList || []);

      // Find top active alert
      const active = (altList || []).find(a => a.status !== 'resuelta');
      setActiveAlert(active || null);
    } catch (e) {
      console.warn('Initial data load warning:', e);
    }
  }, []);

  // Setup Real-time Subscribers
  useEffect(() => {
    loadInitialData();
    api.initRealtime();

    const unsubStatus = api.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    const unsubTelemetry = api.onTelemetry((reading) => {
      // Update latest readings array
      setLatestReadings(prev => {
        const next = [...prev];
        const idx = next.findIndex(r => r.node_id === reading.node_id);
        if (idx >= 0) {
          next[idx] = reading;
        } else {
          next.push(reading);
        }
        return next;
      });

      // Append to historical sparkline points
      setHistory(prev => {
        const next = [...prev, reading];
        return next.slice(-40);
      });
    });

    const unsubAlert = api.onAlert((newAlert) => {
      // Add or update alert in list
      setAlerts(prev => {
        const next = [newAlert, ...prev.filter(a => a.id !== newAlert.id)];
        return next;
      });

      if (newAlert.status !== 'resuelta') {
        setActiveAlert(newAlert);

        // Sound trigger
        if (newAlert.severity === 'urgente') {
          audioService.playUrgentAlarm();
          audioService.speakAlert(`Alerta urgente: ${newAlert.title}. Cierre la llave de paso.`);
        } else if (newAlert.severity === 'alerta_temprana') {
          audioService.playSonarPing();
        }
      }

      // Refresh metrics counters
      api.getSummaryMetrics().then(setMetrics).catch(() => {});
    });

    const unsubScenario = api.onScenario((sc) => {
      setCurrentScenario(sc);
    });

    return () => {
      unsubStatus();
      unsubTelemetry();
      unsubAlert();
      unsubScenario();
    };
  }, [loadInitialData]);

  // Scenario Injection
  const handleSelectScenario = async (sc) => {
    setCurrentScenario(sc);
    try {
      await api.setSimulatorScenario(sc);
      audioService.playSonarPing();
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve Alert Action
  const handleResolveAlert = async (alertId) => {
    try {
      const updated = await api.updateAlertStatus(alertId, 'resuelta');
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resuelta' } : a));
      if (activeAlert && activeAlert.id === alertId) {
        setActiveAlert(null);
      }
      audioService.playSuccessChime();
      const updatedMetrics = await api.getSummaryMetrics();
      setMetrics(updatedMetrics);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Gemini AI Diagnosis for an Alert
  const handleExplainWithAi = async (alert) => {
    try {
      const res = await api.explainAlertWithAI(alert.id);
      setAiModalData({
        alert,
        source: res.source,
        explanation: res.explanation,
        probable_causes: res.probable_causes,
        recommended_actions: res.recommended_actions,
        risk_assessment: res.risk_assessment
      });
      setAiModalOpen(true);
      audioService.playSonarPing();
    } catch (e) {
      console.error(e);
    }
  };

  // Open Daily Executive AI Report
  const handleOpenAiDailyReport = async () => {
    try {
      const res = await api.getDailyAIReport();
      setAiModalData({
        source: res.source,
        summary: res.summary,
        saving_tips: res.saving_tips
      });
      setAiModalOpen(true);
      audioService.playSonarPing();
    } catch (e) {
      console.error(e);
    }
  };

  // Play Spoken Voice
  const handlePlayVoice = (alert) => {
    const text = `${alert.title}. ${alert.description}`;
    audioService.speakAlert(text);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark-theme' : 'light-theme bg-slate-100 text-slate-900'}`}>
      
      {/* 1. Navigation Header */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isMuted={isMuted}
        toggleMute={toggleMute}
        connectionStatus={connectionStatus}
        onOpenInstaller={() => setInstallerOpen(true)}
        onOpenAiReport={handleOpenAiDailyReport}
      />

      {/* 2. Interactive Anomaly Scenario Injection Bar (Hackathon Demo Tool) */}
      <ScenarioBar
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
      />

      {/* Main App Container */}
      <main className="px-4 lg:px-8 py-4 max-w-7xl mx-auto space-y-4">
        
        {/* 3. Floating Alert Banner (When anomaly detected) */}
        <AlertBanner
          activeAlert={activeAlert}
          onResolve={handleResolveAlert}
          onOpenAi={handleExplainWithAi}
          onPlayVoice={handlePlayVoice}
        />

        {/* 4. Top Hero Metric KPIs */}
        <MetricsCards
          metrics={metrics}
          latestReadings={latestReadings}
        />

        {/* 5. Interactive Hydraulic Blueprint Map */}
        <HydraulicMap
          latestReadings={latestReadings}
          activeAlerts={alerts.filter(a => a.status !== 'resuelta')}
          onSelectZone={(zoneId) => {}}
        />

        {/* 6. Real-Time Sparkline Charts (Flow vs Baseline, Pressure vs Safety Bounds) */}
        <LiveCharts
          history={history}
          latestReadings={latestReadings}
        />

        {/* 7. Monitored Hydraulic Zones Grid */}
        <ZoneCards
          latestReadings={latestReadings}
          onSelectZone={(zoneId) => {}}
        />

        {/* 8. Event Log & Alert History */}
        <AlertsList
          alerts={alerts}
          onResolveAlert={handleResolveAlert}
          onOpenAi={handleExplainWithAi}
          onPlayVoice={handlePlayVoice}
        />

      </main>

      {/* 9. Gemini AI Diagnosis Modal */}
      <AiModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        data={aiModalData}
        onSpeak={(text) => audioService.speakAlert(text)}
      />

      {/* 10. Installer Mode Step-by-Step Wizard */}
      <InstallerWizard
        isOpen={installerOpen}
        onClose={() => setInstallerOpen(false)}
        onNodePaired={async (payload) => {
          await api.pairNode(payload);
          await loadInitialData();
        }}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 gap-2">
          <div className="flex items-center gap-2">
            <img src="/dinoflow-logo.svg" alt="DinoFlow" className="w-4 h-4" />
            <span className="font-bold text-slate-400">DinoFlow MVP</span>
            <span>• Sistema de Tuberías Inteligentes Local-First</span>
          </div>
          <div>
            <span>Diseñado para PyMEs, Instaladores y Hackatones MLH</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

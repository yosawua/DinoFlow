import React, { useState } from 'react';
import { X, Wrench, QrCode, CheckCircle2, ChevronRight, ChevronLeft, Wifi, Cable, Gauge, Droplet, Thermometer, ShieldCheck } from 'lucide-react';
import { audioService } from '../services/audio';

export default function InstallerWizard({ isOpen, onClose, onNodePaired }) {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [siteName, setSiteName] = useState('Residencia Las Palmas');
  const [waterCost, setWaterCost] = useState('25.50');
  const [selectedZone, setSelectedZone] = useState('zone-acometida');
  const [nodeId, setNodeId] = useState('node-esp32-nuevo-05');
  const [connectionType, setConnectionType] = useState('wifi');
  const [isScanning, setIsScanning] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [pairedSuccess, setPairedSuccess] = useState(false);

  // Live sensor test values (simulated telemetry reading for plumber test)
  const [testPressure, setTestPressure] = useState(2.35);
  const [testFlow, setTestFlow] = useState(0.0);
  const [testTemp, setTestTemp] = useState(21.4);
  const [calibrated, setCalibrated] = useState(false);

  // Checklist items
  const [checklist, setChecklist] = useState({
    pressureTest: false,
    purgedAir: false,
    checkValveInstalled: false,
    noLeaksVisual: false,
    groundWireConnected: false
  });

  const toggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSimulateQrScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setNodeId(`node-esp32-${Math.random().toString(16).slice(2, 6)}`);
      setIsScanning(false);
      audioService.playSonarPing();
    }, 1200);
  };

  const handlePair = async () => {
    setIsPairing(true);
    try {
      const payload = {
        node_id: nodeId,
        site_id: 'site-casa-01',
        zone_id: selectedZone,
        name: `Nodo Instalador ${nodeId}`,
        mac_address: '24:6F:28:C4:B2:89',
        connection_type: connectionType
      };

      if (onNodePaired) {
        await onNodePaired(payload);
      }

      setPairedSuccess(true);
      audioService.playSuccessChime();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPairing(false);
    }
  };

  const handleCalibrate = () => {
    setTestPressure(2.40);
    setCalibrated(true);
    audioService.playSuccessChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-2xl bg-slate-900 border border-sky-500/40 rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-slate-950 font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Modo Instalador: Asistente de Puesta en Marcha
              </h2>
              <p className="text-xs text-slate-400">
                Guía técnica para plomeros y técnicos en campo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[
            { n: 1, label: 'Sitio' },
            { n: 2, label: 'Emparejar Nodo' },
            { n: 3, label: 'Prueba en Vivo' },
            { n: 4, label: 'Checklist Final' }
          ].map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-1.5">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.n
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                    : step > s.n
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={`text-[11px] font-medium ${step >= s.n ? 'text-slate-200' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Site & Hierarchy Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">1. Parámetros del Sitio e Instalación</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre de la Ubicación / Casa</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Costo Local del Agua ($ MXN por m³)</label>
              <input
                type="number"
                value={waterCost}
                onChange={(e) => setWaterCost(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Utilizado para calcular en tiempo real los costos monetarios de agua desperdiciada en fugas.
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Node Pairing & QR Scan */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">2. Emparejamiento del Nodo Sensor DinoFlow</h3>
            
            {/* Zone Selection */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Zona Hidráulica Asignada</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="zone-acometida">Acometida Principal (Calle/Medidor)</option>
                <option value="zone-cocina-pb">Cocina & Baño Planta Baja</option>
                <option value="zone-jardin">Jardín y Riego Exterior</option>
                <option value="zone-planta-alta">Tinaco y Baños Planta Alta</option>
              </select>
            </div>

            {/* Connection Type */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Medio Físico de Conexión</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConnectionType('wifi')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                    connectionType === 'wifi'
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span>WiFi (ESP32 Integrado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionType('rs485')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                    connectionType === 'rs485'
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Cable className="w-4 h-4" />
                  <span>Cable UTP (RS-485 / Modbus)</span>
                </button>
              </div>
            </div>

            {/* QR Scan or Manual Device Code */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Identificador de Hardware / Código QR</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nodeId}
                  onChange={(e) => setNodeId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  onClick={handleSimulateQrScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isScanning ? 'Escaneando...' : 'Escanear QR'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={handlePair}
              disabled={isPairing || pairedSuccess}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                pairedSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              {pairedSuccess ? '✓ Nodo Emparejado y Registrado en Red' : isPairing ? 'Emparejando...' : 'Vincular y Dar de Alta Nodo'}
            </button>
          </div>
        )}

        {/* Step 3: Live Sensor Test & Calibration */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">3. Prueba de Telemetría en Vivo de Sensores</h3>
            <p className="text-xs text-slate-400">
              Verificación directa de los transductores físicos conectados al nodo antes de fijar tuberías:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {/* Pressure Sensor */}
              <div className="glass-card p-3 text-center border-slate-700">
                <Gauge className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 block">Presión Línea</span>
                <span className="text-lg font-bold text-white">{testPressure} bar</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">0.5 - 4.5V Analógico</span>
              </div>

              {/* Flow Sensor */}
              <div className="glass-card p-3 text-center border-slate-700">
                <Droplet className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 block">Caudalímetro</span>
                <span className="text-lg font-bold text-white">{testFlow} L/min</span>
                <span className="text-[9px] text-cyan-400 block mt-0.5">YF-S201 Pulsos Hall</span>
              </div>

              {/* Temp Sensor */}
              <div className="glass-card p-3 text-center border-slate-700">
                <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <span className="text-[11px] text-slate-400 block">Temperatura</span>
                <span className="text-lg font-bold text-white">{testTemp} °C</span>
                <span className="text-[9px] text-amber-400 block mt-0.5">DS18B20 1-Wire</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Calibración de Presión a Cero</span>
                <span className="text-[11px] text-slate-400">Ajusta el offset del transductor analógico</span>
              </div>
              <button
                onClick={handleCalibrate}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  calibrated 
                    ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' 
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                }`}
              >
                {calibrated ? '✓ Calibrado' : 'Ajustar Tara'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Installation Checklist */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">4. Checklist de Entrega Hidráulica</h3>
            <p className="text-xs text-slate-400">
              Validaciones de seguridad requeridas para garantizar la estanqueidad y soporte de presión:
            </p>

            <div className="space-y-2">
              {[
                { id: 'pressureTest', label: 'Prueba de Presión Estática Realizada (mínimo 3.0 bar sin pérdidas)' },
                { id: 'purgedAir', label: 'Purga de Bolsas de Aire en Ramales Secundarios Realizada' },
                { id: 'checkValveInstalled', label: 'Válvula Antirretorno / Check verificada con flecha de flujo correcta' },
                { id: 'noLeaksVisual', label: 'Inspección visual en uniones CPVC / PPR sin gotas ni humedad' },
                { id: 'groundWireConnected', label: 'Alimentación de 5V / 12V protegida contra humedad IP65' }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${
                    checklist[item.id]
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.id]}
                    onChange={() => {}}
                    className="rounded text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span>
                Al finalizar, el sitio queda registrado en la base de datos local y el nodo comienza el reporte telemétrico continuo.
              </span>
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                audioService.playSuccessChime();
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalizar y Certificar Instalación</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

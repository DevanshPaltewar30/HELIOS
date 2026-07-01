// ============================================================
// HELIOS — Main Application Entry
// Real-Time Space Weather Forecast Dashboard
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Wind, Database, Wifi, WifiOff, X } from 'lucide-react';

import KPIStrip          from './components/KPIStrip';
import FanChart          from './components/FanChart';
import GatedFusionPanel  from './components/GatedFusionPanel';
import DriversTab        from './components/DriversTab';
import DiagnosticsTab    from './components/DiagnosticsTab';
import SimulationSidebar from './components/SimulationSidebar';

import { fetchTelemetryStream, checkBackendHealth } from './api/heliosApi';
import type {
  TelemetryStreamResponse, ActiveTab, TelemetryPoint,
  ForecastStep, ModelGateWeights, SystemAlert, VSNWeightTable
} from './types/helios.types';

const TOTAL_STEPS = 120;

function alertBadgeColor(sev: SystemAlert['severity']): string {
  if (sev === 'CRITICAL') return 'bg-red-50 border-red-200 text-red-700';
  if (sev === 'WARNING')  return 'bg-amber-50 border-amber-200 text-amber-700';
  return 'bg-slate-50 border-slate-200 text-slate-600';
}

const App: React.FC = () => {
  // ── Simulation state ─────────────────────────────────────
  const [currentStep, setCurrentStep]   = useState<number>(0);
  const [isPlaying,   setIsPlaying]     = useState<boolean>(false);
  const [threshold,   setThreshold]     = useState<number>(3.8);
  const [activeTab,   setActiveTab]     = useState<ActiveTab>('realtime');
  const [statusMsg,   setStatusMsg]     = useState<string>('Initializing...');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [loading,     setLoading]       = useState<boolean>(true);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data state ────────────────────────────────────────────
  const [history,       setHistory]       = useState<TelemetryPoint[]>([]);
  const [forecastSteps, setForecastSteps] = useState<ForecastStep[]>([]);
  const [gatedWeights,  setGatedWeights]  = useState<ModelGateWeights>({
    tftBackbone: 0.25, piTcnCore: 0.25, liquidNeuralNet: 0.25, sslPretrainedBase: 0.25
  });
  const [systemAlerts,  setSystemAlerts]  = useState<SystemAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [vsnWeights,    setVsnWeights]    = useState<VSNWeightTable | null>(null);

  // ── Fetch telemetry from backend ─────────────────────────
  const fetchStep = useCallback(async (step: number) => {
    try {
      const data: TelemetryStreamResponse = await fetchTelemetryStream(step);
      setHistory(data.history);
      setForecastSteps(data.forecast.steps);
      setGatedWeights(data.quantileBundle.gatedWeights);
      setSystemAlerts(data.systemAlerts);
      setVsnWeights(data.vsnWeights);
      setStatusMsg(`Step ${step + 1}/${TOTAL_STEPS} · ${data.history[data.history.length - 1]?.cmePhase ?? ''}`);
      setLoading(false);
    } catch {
      setStatusMsg('Backend unreachable — check API connection');
      setLoading(false);
    }
  }, []);

  // ── Check backend health on mount ────────────────────────
  useEffect(() => {
    checkBackendHealth().then(online => {
      setBackendOnline(online);
      if (!online) setStatusMsg('⚠ Backend offline / unreachable');
    });
  }, []);

  // Force light mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // ── Initial fetch ─────────────────────────────────────────
  useEffect(() => {
    fetchStep(currentStep);
  }, [currentStep, fetchStep]);

  // ── Auto-play interval ────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= TOTAL_STEPS - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') setCurrentStep(p => Math.min(p + 1, TOTAL_STEPS - 1));
      if (e.key === 'ArrowLeft')  setCurrentStep(p => Math.max(p - 1, 0));
      if (e.key === ' ')          setIsPlaying(p => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Jump-step event from sidebar input ────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const step = (e as CustomEvent<number>).detail;
      setCurrentStep(step);
    };
    window.addEventListener('helios-jump-step', handler);
    return () => window.removeEventListener('helios-jump-step', handler);
  }, []);

  // ── Reset dismissed alerts on step change ─────────────────
  useEffect(() => {
    setDismissedAlerts([]);
  }, [currentStep]);

  // ── Handlers ──────────────────────────────────────────────
  const handleStepForward  = () => setCurrentStep(p => Math.min(p + 1, TOTAL_STEPS - 1));
  const handleStepBack     = () => setCurrentStep(p => Math.max(p - 1, 0));
  const handleSkipToStart  = () => { setCurrentStep(0); setIsPlaying(false); };
  const handleSkipToEnd    = () => { setCurrentStep(TOTAL_STEPS - 1); setIsPlaying(false); };
  const handleTogglePlay   = () => setIsPlaying(p => !p);

  const currentPoint = history[history.length - 1] ?? null;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'realtime',    label: 'Real-Time Operations',       icon: <Activity size={13} /> },
    { id: 'drivers',     label: 'L1 Heliophysics Drivers',    icon: <Wind size={13} />     },
    { id: 'diagnostics', label: 'Data Ingestion & Diagnostics', icon: <Database size={13} /> },
  ];

  return (
    <>
      <div className="space-bg fixed inset-0 z-0" />
      <div className="flex h-screen bg-transparent overflow-hidden text-space-text relative z-10">
        {/* ── Sidebar ─────────────────────────────────────── */}
      <SimulationSidebar
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        threshold={threshold}
        isPlaying={isPlaying}
        onStepForward={handleStepForward}
        onStepBack={handleStepBack}
        onSkipToStart={handleSkipToStart}
        onSkipToEnd={handleSkipToEnd}
        onTogglePlay={handleTogglePlay}
        onThresholdChange={setThreshold}
      />

      {/* ── Main content ────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Floating System Alerts (Top Right, Dismissible) */}
        <div className="absolute top-14 right-6 w-80 z-50 flex flex-col gap-2 pointer-events-none mt-2">
          {systemAlerts.filter(a => !dismissedAlerts.includes(a.alertId) && a.severity === 'CRITICAL').length > 0 && (
            <div className="self-end text-[9px] bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded-full font-mono alert-critical pointer-events-auto shadow-sm">
              {systemAlerts.filter(a => !dismissedAlerts.includes(a.alertId) && a.severity === 'CRITICAL').length} CRITICAL
            </div>
          )}
          {systemAlerts.filter(a => !dismissedAlerts.includes(a.alertId) && a.severity !== 'INFO').map(alert => (
            <div
              key={alert.alertId}
              className={`border rounded-lg px-3 py-2 text-[10px] font-mono shadow-md pointer-events-auto backdrop-blur-md transition-all flex items-start justify-between gap-2 ${alertBadgeColor(alert.severity)}`}
            >
              <div className="flex-1">
                <div className="font-bold mb-0.5">
                  [{alert.severity}] {alert.parameter}
                </div>
                <div className="leading-tight opacity-95">{alert.message}</div>
              </div>
              <button
                onClick={() => setDismissedAlerts(prev => [...prev, alert.alertId])}
                className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 opacity-60 hover:opacity-100 transition-all"
                title="Close Alert"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Header bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-space-border bg-space-surface flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Tab navigation */}
            {tabs.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-all rounded-t
                  ${activeTab === tab.id ? 'tab-active' : 'text-space-muted hover:text-space-text'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-space-muted">{statusMsg}</span>
            <div className={`flex items-center gap-1 text-[10px] font-mono
              ${backendOnline ? 'text-space-green' : 'text-space-red'}`}>
              {backendOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
              {backendOnline ? 'API ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-space-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm font-mono text-space-muted">{statusMsg}</div>
              </div>
            </div>
          ) : (
            <>
              {/* ── TAB 1: Real-Time Operations ─────────── */}
              {activeTab === 'realtime' && (
                <>
                  <KPIStrip
                    currentPoint={currentPoint}
                    forecastSteps={forecastSteps}
                    threshold={threshold}
                  />
                  <FanChart
                    history={history}
                    forecastSteps={forecastSteps}
                    threshold={threshold}
                    currentStep={currentStep}
                  />
                  <GatedFusionPanel
                    weights={gatedWeights}
                    cmePhase={currentPoint?.cmePhase ?? 'AMBIENT'}
                  />
                </>
              )}

              {/* ── TAB 2: L1 Heliophysics Drivers ──────── */}
              {activeTab === 'drivers' && (
                <DriversTab
                  history={history}
                  vsnWeights={vsnWeights}
                />
              )}

              {/* ── TAB 3: Data Diagnostics ─────────────── */}
              {activeTab === 'diagnostics' && (
                <DiagnosticsTab onMessage={setStatusMsg} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
    </>
  );
};

export default App;

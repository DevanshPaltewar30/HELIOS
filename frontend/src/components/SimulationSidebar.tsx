// ============================================================
// SimulationSidebar — CME step control + threshold control
// ============================================================

import React from 'react';
import {
  ChevronRight, ChevronLeft, SkipForward, SkipBack,
  Play, Pause, Settings, Satellite, Radio
} from 'lucide-react';

interface SimulationSidebarProps {
  currentStep: number;
  totalSteps: number;
  threshold: number;
  isPlaying: boolean;
  onStepForward: () => void;
  onStepBack: () => void;
  onSkipToStart: () => void;
  onSkipToEnd: () => void;
  onTogglePlay: () => void;
  onThresholdChange: (val: number) => void;
}

const PHASE_STEPS = [
  { label: 'AMBIENT',  start: 0,   end: 29,  color: '#3FB950' },
  { label: 'SHEATH',   start: 30,  end: 44,  color: '#D29922' },
  { label: 'EJECTA',   start: 45,  end: 79,  color: '#F85149' },
  { label: 'RECOVERY', start: 80,  end: 119, color: '#388BFD' },
];

function currentPhase(step: number) {
  return PHASE_STEPS.find(p => step >= p.start && step <= p.end) ?? PHASE_STEPS[0];
}

const SimulationSidebar: React.FC<SimulationSidebarProps> = ({
  currentStep, totalSteps, threshold, isPlaying,
  onStepForward, onStepBack, onSkipToStart, onSkipToEnd,
  onTogglePlay, onThresholdChange
}) => {
  const phase = currentPhase(currentStep);
  const progress = ((currentStep) / (totalSteps - 1)) * 100;

  return (
    <aside className="w-64 flex-shrink-0 bg-space-surface glass-panel border-r border-space-border flex flex-col h-screen overflow-y-auto z-20">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-space-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-space-cyan to-space-purple flex items-center justify-center shadow-md">
            <Satellite size={16} className="text-white" />
          </div>
          <div>
            <div className="text-base font-extrabold text-space-text font-sans tracking-wide leading-none">HELIOS</div>
            <div className="text-[9px] text-space-muted font-mono mt-0.5">ISRO · PS-14</div>
          </div>
        </div>
        <div className="mt-2 text-[9px] font-mono text-space-muted leading-tight">
          Heliophysics-Embedded Longitude-Invariant Operational Sequence Forecaster
        </div>
      </div>

      {/* Satellite Image Header */}
      <div className="w-full h-32 relative border-b border-space-border overflow-hidden group flex-shrink-0">
        <img 
          src="/isro_satellite.png" 
          alt="ISRO HELIOS Satellite" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-space-surface/75 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-space-cyan animate-pulse shadow-[0_0_5px_#EA580C]" />
                <span className="text-[9px] font-mono text-space-cyan font-bold tracking-wider">UPLINK ACTIVE</span>
            </div>
            <span className="text-[8px] font-mono text-space-muted font-bold">L1 ORBIT</span>
        </div>
      </div>

      {/* CME Timeline */}
      <div className="p-4 border-b border-space-border">
        <div className="flex items-center gap-1 mb-2">
          <Radio size={10} className="text-space-cyan" />
          <span className="text-[10px] font-mono text-space-muted uppercase tracking-widest">CME Timeline</span>
        </div>

        {/* Phase label */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-bold" style={{ color: phase.color }}>
            {phase.label}
          </span>
          <span className="text-[10px] font-mono text-space-text">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>

        {/* Progress bar with phase segments */}
        <div className="relative h-3 bg-space-panel rounded-full overflow-hidden mb-2">
          {PHASE_STEPS.map(p => (
            <div
              key={p.label}
              className="absolute top-0 h-full opacity-30"
              style={{
                left:  `${(p.start / totalSteps) * 100}%`,
                width: `${((p.end - p.start + 1) / totalSteps) * 100}%`,
                background: p.color
              }}
            />
          ))}
          <div
            className="absolute top-0 left-0 h-full bg-space-cyan rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, opacity: 0.8 }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-lg transition-all duration-300"
            style={{ left: `calc(${progress}% - 4px)` }}
          />
        </div>

        {/* Phase mini legend */}
        <div className="flex justify-between text-[8px] font-mono mb-3">
          {PHASE_STEPS.map(p => (
            <span key={p.label} style={{ color: p.color }}>{p.label.slice(0, 3)}</span>
          ))}
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-1 mb-3">
          <button id="skip-to-start-btn" onClick={onSkipToStart}
            className="step-btn p-1.5 rounded-lg bg-space-panel hover:bg-space-border text-space-muted hover:text-space-text transition-colors">
            <SkipBack size={14} />
          </button>
          <button id="step-back-btn" onClick={onStepBack}
            className="step-btn p-1.5 rounded-lg bg-space-panel hover:bg-space-border text-space-muted hover:text-space-text transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button id="play-pause-btn" onClick={onTogglePlay}
            className="step-btn p-2 rounded-lg bg-space-cyan/20 border border-space-cyan hover:bg-space-cyan/40 text-space-cyan transition-all">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button id="step-forward-btn" onClick={onStepForward}
            className="step-btn p-1.5 rounded-lg bg-space-panel hover:bg-space-border text-space-muted hover:text-space-text transition-colors">
            <ChevronRight size={14} />
          </button>
          <button id="skip-to-end-btn" onClick={onSkipToEnd}
            className="step-btn p-1.5 rounded-lg bg-space-panel hover:bg-space-border text-space-muted hover:text-space-text transition-colors">
            <SkipForward size={14} />
          </button>
        </div>

        {/* Direct step input */}
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-mono text-space-muted">Jump to step:</label>
          <input
            id="step-jump-input"
            type="number"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0 && v < totalSteps) {
                // Controlled externally via context — skip
                const evt = new CustomEvent('helios-jump-step', { detail: v });
                window.dispatchEvent(evt);
              }
            }}
            className="w-14 bg-space-panel border border-space-border rounded px-1.5 py-0.5 text-[11px] font-mono text-space-text focus:border-space-cyan focus:outline-none"
          />
        </div>
      </div>

      {/* Threshold control */}
      <div className="p-4 border-b border-space-border">
        <div className="flex items-center gap-1 mb-2">
          <Settings size={10} className="text-space-yellow" />
          <span className="text-[10px] font-mono text-space-muted uppercase tracking-widest">Threshold</span>
        </div>
        <div className="text-[10px] font-mono text-space-muted mb-1">
          Charging Danger Level: <span className="text-space-yellow font-bold">{threshold.toFixed(1)}</span> log₁₀
        </div>
        <input
          id="threshold-slider"
          type="range"
          min={2.5}
          max={5.0}
          step={0.1}
          value={threshold}
          onChange={e => onThresholdChange(parseFloat(e.target.value))}
          className="w-full accent-space-yellow"
        />
        <div className="flex justify-between text-[8px] font-mono text-space-muted mt-0.5">
          <span>2.5</span>
          <span>3.8 (default)</span>
          <span>5.0</span>
        </div>
      </div>

      {/* Empty flex-1 to push footer to bottom */}
      <div className="p-4 flex-1"></div>

      {/* Status footer */}
      <div className="p-3 border-t border-space-border bg-space-panel/50">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-space-green animate-pulse' : 'bg-space-muted'}`} />
          <span className="text-[9px] font-mono text-space-muted">
            {isPlaying ? 'AUTO-ADVANCING · 1s interval' : 'PAUSED · Manual step'}
          </span>
        </div>
        <div className="text-[8px] font-mono text-space-muted mt-0.5">
          Backend: {import.meta.env.DEV ? 'localhost:3001' : 'Integrated API (Production)'}
        </div>
      </div>
    </aside>
  );
};

export default SimulationSidebar;

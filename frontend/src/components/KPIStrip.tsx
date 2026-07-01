// ============================================================
// KPIStrip — 4-card metric bar for Real-Time Operations tab
// ============================================================

import React from 'react';
import { Activity, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import type { TelemetryPoint, ForecastStep } from '../types/helios.types';

interface KPIStripProps {
  currentPoint: TelemetryPoint | null;
  forecastSteps: ForecastStep[];
  threshold: number;
}

function fluxBorderClass(flux: number, threshold: number): string {
  if (flux > threshold)         return 'kpi-border-critical border-2';
  if (flux > threshold - 0.3)  return 'kpi-border-warning border-2';
  return 'kpi-border-nominal border-2';
}

function confidenceRange(steps: ForecastStep[]): string {
  if (!steps.length) return '—';
  const ranges = steps.map(s => s.p90 - s.p10);
  const avg = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  return `±${avg.toFixed(2)} dex`;
}

function exceedanceProb(steps: ForecastStep[]): number {
  if (!steps.length) return 0;
  return Math.round(steps.reduce((a, s) => a + s.exceedanceProbability, 0) / steps.length);
}

function regimeColor(regime: string): string {
  if (regime.includes('Acceleration') || regime.includes('Enhancement')) return 'text-space-red';
  if (regime.includes('Dropout') || regime.includes('Shadow'))            return 'text-space-orange';
  if (regime.includes('Substorm') || regime.includes('Injection'))        return 'text-space-yellow';
  if (regime.includes('Quiet'))                                            return 'text-space-green';
  return 'text-space-cyan';
}

const KPIStrip: React.FC<KPIStripProps> = ({ currentPoint, forecastSteps, threshold }) => {
  const flux   = currentPoint?.electronFluxLog10 ?? 0;
  const regime = currentPoint?.physicsRegime ?? 'Loading...';
  const prob   = exceedanceProb(forecastSteps);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1 — Electron Flux */}
      <div className={`bg-space-surface glass-panel rounded-lg p-4 ${fluxBorderClass(flux, threshold)} relative overflow-hidden`}>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={14} className="text-space-cyan" />
          <span className="text-[10px] font-mono text-space-muted uppercase tracking-widest">e⁻ Flux &gt;2 MeV</span>
        </div>
        <div className="text-3xl font-mono font-bold text-space-text mt-1">
          10<sup className="text-lg">{flux.toFixed(2)}</sup>
        </div>
        <div className="text-[10px] font-mono text-space-muted mt-1">particles/cm²·s·sr</div>
        <div className={`text-[10px] font-mono mt-2 font-semibold ${flux > threshold ? 'text-space-red' : 'text-space-green'}`}>
          {flux > threshold ? '⚠ CHARGING RISK' : '✓ NOMINAL'}
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-5">
          <Activity size={80} />
        </div>
      </div>

      {/* Card 2 — Forecast Confidence */}
      <div className="bg-space-surface glass-panel rounded-lg p-4 border-2 kpi-border-cyan relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={14} className="text-space-cyan" />
          <span className="text-[10px] font-mono text-space-muted uppercase tracking-widest">P10–P90 Range</span>
        </div>
        <div className="text-3xl font-mono font-bold text-space-cyan mt-1">
          {confidenceRange(forecastSteps)}
        </div>
        <div className="text-[10px] font-mono text-space-muted mt-1">forecast spread</div>
        <div className="flex gap-1 mt-2">
          {forecastSteps.map(s => (
            <div key={s.horizonLabel} className="text-[9px] font-mono text-space-cyan bg-space-panel px-1 rounded">
              {s.horizonLabel}: {(s.p90 - s.p10).toFixed(2)}
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 — Exceedance Probability */}
      <div className={`bg-space-surface glass-panel rounded-lg p-4 border-2 relative overflow-hidden
        ${prob > 70 ? 'kpi-border-critical' : prob > 40 ? 'kpi-border-warning' : 'kpi-border-nominal'}`}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-space-yellow" />
          <span className="text-[10px] font-mono text-space-muted uppercase tracking-widest">Exceedance Prob</span>
        </div>
        <div className={`text-3xl font-mono font-bold mt-1 ${prob > 70 ? 'text-space-red' : prob > 40 ? 'text-space-yellow' : 'text-space-green'}`}>
          {prob}<span className="text-lg">%</span>
        </div>
        <div className="text-[10px] font-mono text-space-muted mt-1">P(flux &gt; {threshold} log₁₀)</div>
        {/* Mini probability bar */}
        <div className="w-full bg-space-panel rounded-full h-1 mt-2">
          <div
            className={`h-1 rounded-full transition-all duration-500 ${prob > 70 ? 'bg-space-red' : prob > 40 ? 'bg-space-yellow' : 'bg-space-green'}`}
            style={{ width: `${prob}%` }}
          />
        </div>
      </div>

      {/* Card 4 — Physics Regime */}
      <div className="bg-space-surface glass-panel rounded-lg p-4 border-2 border-space-border relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} className="text-space-purple" />
          <span className="text-[10px] font-mono text-space-muted uppercase tracking-widest">Physics Regime</span>
        </div>
        <div className={`text-sm font-mono font-bold mt-2 leading-tight ${regimeColor(regime)}`}>
          {regime}
        </div>
        <div className="text-[10px] font-mono text-space-muted mt-2">
          Phase: <span className="text-space-text font-semibold">{currentPoint?.cmePhase ?? '—'}</span>
        </div>
        <div className="text-[10px] font-mono text-space-muted">
          Vsw: <span className="text-space-cyan">{currentPoint?.solarWindVelocity.toFixed(0) ?? '—'} km/s</span>
        </div>
      </div>
    </div>
  );
};

export default KPIStrip;

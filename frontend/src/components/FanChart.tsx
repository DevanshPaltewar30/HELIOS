// ============================================================
// FanChart — Probabilistic electron flux forecast fan chart
// Historical observed line + P10-P90 shaded envelope
// ============================================================

import React, { useMemo } from 'react';
import {
  ComposedChart, Line, Area, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { TelemetryPoint, ForecastStep } from '../types/helios.types';

interface FanChartProps {
  history: TelemetryPoint[];
  forecastSteps: ForecastStep[];
  threshold: number;
  currentStep: number;
}

interface ChartPoint {
  label: string;
  observed?: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  envelope?: [number, number]; // [p10, p90] for area chart
  innerBand?: [number, number]; // [p25, p75]
  threshold: number;
  isForecast: boolean;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number | number[]; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="text-space-cyan font-bold mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="text-[11px] font-mono">
          {p.name}: {Array.isArray(p.value) ? `${p.value[0]?.toFixed(2)} – ${p.value[1]?.toFixed(2)}` : typeof p.value === 'number' ? p.value.toFixed(3) : ''} log₁₀
        </div>
      ))}
    </div>
  );
};

const FanChart: React.FC<FanChartProps> = ({ history, forecastSteps, threshold, currentStep }) => {
  const data = useMemo((): ChartPoint[] => {
    const points: ChartPoint[] = [];

    // Historical window — show last 20 points
    const histWindow = history.slice(-20);
    histWindow.forEach((h, i) => {
      points.push({
        label: `T${currentStep - histWindow.length + i + 1}`,
        observed: parseFloat(h.electronFluxLog10.toFixed(3)),
        threshold,
        isForecast: false,
      });
    });

    // Bridge point — last observed becomes p50 start for continuity
    const lastFlux = histWindow[histWindow.length - 1]?.electronFluxLog10 ?? 3.0;

    // Forecast horizon points
    forecastSteps.forEach(s => {
      points.push({
        label: s.horizonLabel,
        p10:  parseFloat(s.p10.toFixed(3)),
        p25:  parseFloat(s.p25.toFixed(3)),
        p50:  parseFloat(s.p50.toFixed(3)),
        p75:  parseFloat(s.p75.toFixed(3)),
        p90:  parseFloat(s.p90.toFixed(3)),
        envelope:  [parseFloat(s.p10.toFixed(3)), parseFloat(s.p90.toFixed(3))],
        innerBand: [parseFloat(s.p25.toFixed(3)), parseFloat(s.p75.toFixed(3))],
        // Carry observed as the bridge
        observed: points.length === histWindow.length ? lastFlux : undefined,
        threshold,
        isForecast: true,
      });
    });

    return points;
  }, [history, forecastSteps, threshold, currentStep]);

  const yMin = 1.0;
  const yMax = 5.2;

  return (
    <div className="bg-space-surface glass-panel rounded-xl border border-space-border p-4 scanlines relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-space-text font-mono">
            PROBABILISTIC ELECTRON FLUX FORECAST
          </h2>
          <p className="text-[10px] text-space-muted mt-0.5">
            &gt;2 MeV | HELIOS Multi-Horizon Ensemble | P10 / P50 / P90 quantiles
          </p>
        </div>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white inline-block"/> Observed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#58C8E3] inline-block border-dashed border-b"/> P50</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#58C8E3] opacity-30 inline-block rounded"/> P10-P90</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#F85149] border-dashed border-b inline-block"/> Threshold</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgb(var(--color-muted))', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgb(var(--color-border))' }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: 'rgb(var(--color-muted))', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgb(var(--color-border))' }}
            tickLine={false}
            tickFormatter={(v: number) => `10^${v.toFixed(1)}`}
            label={{ value: 'log₁₀ Flux', angle: -90, position: 'insideLeft', fill: 'rgb(var(--color-muted))', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Danger threshold reference line */}
          <ReferenceLine
            y={threshold}
            stroke="#F85149"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: 'Deep-Dielectric Charging', fill: '#F85149', fontSize: 9, fontFamily: 'JetBrains Mono', position: 'insideTopRight' }}
          />

          {/* P10-P90 outer envelope */}
          <Area
            type="monotone"
            dataKey="envelope"
            fill="#58C8E3"
            stroke="none"
            fillOpacity={0.12}
            name="P10–P90 Envelope"
            connectNulls={false}
          />

          {/* P25-P75 inner band */}
          <Area
            type="monotone"
            dataKey="innerBand"
            fill="#58C8E3"
            stroke="none"
            fillOpacity={0.20}
            name="P25–P75 Band"
            connectNulls={false}
          />

          {/* P50 median forecast */}
          <Line
            type="monotone"
            dataKey="p50"
            stroke="#58C8E3"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="P50 Forecast"
            connectNulls={false}
          />

          {/* Historical observed */}
          <Line
            type="monotone"
            dataKey="observed"
            stroke="#FFFFFF"
            strokeWidth={2}
            dot={false}
            name="Observed Flux"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Phase indicator strip */}
      <div className="flex gap-1 mt-2">
        {[
          { label: 'AMBIENT', color: '#3FB950' },
          { label: 'SHEATH', color: '#D29922' },
          { label: 'EJECTA', color: '#F85149' },
          { label: 'RECOVERY', color: '#388BFD' },
        ].map(p => (
          <div key={p.label} className="flex items-center gap-1 text-[9px] font-mono" style={{ color: p.color }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: p.color }} />
            {p.label}
          </div>
        ))}
        <span className="ml-auto text-[9px] font-mono text-space-muted">
          Step {currentStep} · 5-min cadence · CME Event 2024-03-14
        </span>
      </div>
    </div>
  );
};

export default FanChart;

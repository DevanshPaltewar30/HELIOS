// ============================================================
// DriversTab — Upstream L1 Heliophysics Solar Wind Drivers
// Vsw, Bz, Pdyn charts + VSN Feature Importance Table
// ============================================================

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { Wind, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { TelemetryPoint, VSNWeightTable } from '../types/helios.types';

interface DriversTabProps {
  history: TelemetryPoint[];
  vsnWeights: VSNWeightTable | null;
}

function TrendIcon({ trend }: { trend: 'RISING' | 'FALLING' | 'STABLE' }) {
  if (trend === 'RISING')  return <TrendingUp  size={12} className="text-space-red inline" />;
  if (trend === 'FALLING') return <TrendingDown size={12} className="text-space-green inline" />;
  return <Minus size={12} className="text-space-muted inline" />;
}

const WindChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  color: string;
  unit: string;
  label: string;
  refVal?: number;
  height?: number;
}> = ({ data, color, unit, label, refVal, height = 100 }) => (
  <div className="mb-4">
    <div className="text-[10px] font-mono text-space-muted mb-1 flex justify-between">
      <span>{label}</span>
      <span style={{ color }} className="font-bold">
        {data[data.length - 1]?.value.toFixed(1)} {unit}
      </span>
    </div>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="rgb(var(--color-border))" />
        <XAxis dataKey="label" hide />
        <YAxis tick={{ fill: 'rgb(var(--color-muted))', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: 6, fontFamily: 'JetBrains Mono', fontSize: 10 }}
          formatter={(v: any) => [`${Number(v).toFixed(2)} ${unit}`, label]}
          labelStyle={{ color }}
        />
        {refVal !== undefined && (
          <ReferenceLine y={refVal} stroke="rgb(var(--color-border))" strokeDasharray="4 4" />
        )}
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const DriversTab: React.FC<DriversTabProps> = ({ history, vsnWeights }) => {
  const toSeries = (key: keyof TelemetryPoint) =>
    history.map((h, i) => ({ label: `T${i}`, value: h[key] as number }));

  const vswData  = toSeries('solarWindVelocity');
  const bzData   = toSeries('bzGSM');
  const pdynData = toSeries('dynamicPressure');
  const newellData = toSeries('newellReconnectionRate');

  const latest = history[history.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: Multi-axis solar wind charts */}
      <div className="bg-space-surface glass-panel rounded-xl border border-space-border p-4">
        {/* Banner with Wind Satellite Image */}
        <div className="w-full h-20 relative rounded-lg overflow-hidden mb-4 border border-space-border">
          <img src="/wind_satellite.png" alt="Wind Satellite" className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-space-bg via-space-bg/50 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-space-cyan/20 flex items-center justify-center border border-space-cyan/30 backdrop-blur-md">
              <Wind size={12} className="text-space-cyan" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-space-text font-mono">L1 SOLAR WIND MONITOR</h2>
              <p className="text-[9px] text-space-cyan">Wind Spacecraft · 5-min cadence · Ballistic shift applied</p>
            </div>
          </div>
        </div>

        {/* CME phase color bar */}
        {latest && (
          <div className={`text-[10px] font-mono px-2 py-1 rounded mb-3 inline-block
            ${latest.cmePhase === 'EJECTA' ? 'bg-red-900/30 text-space-red' :
              latest.cmePhase === 'SHEATH' ? 'bg-yellow-900/30 text-space-yellow' :
              latest.cmePhase === 'RECOVERY' ? 'bg-blue-900/30 text-space-blue' :
              'bg-green-900/30 text-space-green'}`}>
            Phase: {latest.cmePhase}
          </div>
        )}

        <WindChart data={vswData}   color="#58C8E3" unit="km/s" label="Solar Wind Velocity (V_sw)" refVal={400} />
        <WindChart data={bzData}    color="#F85149" unit="nT"   label="IMF B_z GSM (southward = negative)" refVal={0} />
        <WindChart data={pdynData}  color="#D29922" unit="nPa"  label="Dynamic Pressure (P_dyn)" refVal={2} />
        <WindChart data={newellData} color="#A371F7" unit="kV"  label="Newell Reconnection Rate (Φ_N)" />
      </div>

      {/* RIGHT: VSN Feature Importance Table */}
      <div className="bg-space-surface glass-panel rounded-xl border border-space-border p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-space-text font-mono">VSN FEATURE IMPORTANCE</h2>
          <p className="text-[10px] text-space-muted mt-0.5">
            Variable Selection Network weights from TFT encoder layer
          </p>
        </div>

        {vsnWeights ? (
          <div>
            <div className="text-[10px] font-mono text-space-cyan mb-2 uppercase tracking-widest">Encoder Layer</div>
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-space-border">
                  <th className="text-left text-space-muted py-1 pr-2">#</th>
                  <th className="text-left text-space-muted py-1 pr-2">Symbol</th>
                  <th className="text-left text-space-muted py-1 pr-2">Variable</th>
                  <th className="text-left text-space-muted py-1 pr-2">Unit</th>
                  <th className="text-right text-space-muted py-1 pr-2">Weight</th>
                  <th className="text-right text-space-muted py-1">Trend</th>
                </tr>
              </thead>
              <tbody>
                {vsnWeights.encoderWeights.map(entry => (
                  <tr key={entry.rank} className="vsn-row border-b border-space-border">
                    <td className="py-1.5 pr-2 text-space-muted">{entry.rank}</td>
                    <td className="py-1.5 pr-2 text-space-cyan font-bold">{entry.scientificSymbol}</td>
                    <td className="py-1.5 pr-2 text-space-text">{entry.variableName}</td>
                    <td className="py-1.5 pr-2 text-space-muted">{entry.unit}</td>
                    <td className="py-1.5 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-space-panel rounded-full h-1">
                          <div
                            className="h-1 rounded-full bg-space-cyan"
                            style={{ width: `${Math.round(entry.weight * 100)}%` }}
                          />
                        </div>
                        <span className="text-space-text">{(entry.weight * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right">
                      <TrendIcon trend={entry.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] font-mono text-space-muted mt-3">
              Updated: {new Date(vsnWeights.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-space-muted text-sm font-mono">
            Loading VSN weights...
          </div>
        )}
      </div>
    </div>
  );
};

export default DriversTab;

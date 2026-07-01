// ============================================================
// GatedFusionPanel — Horizontal bar chart for model sub-streams
// ============================================================

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer
} from 'recharts';
import { Cpu } from 'lucide-react';
import type { ModelGateWeights } from '../types/helios.types';

interface GatedFusionPanelProps {
  weights: ModelGateWeights;
  cmePhase: string;
}

const STREAM_CONFIG = [
  { key: 'tftBackbone',       label: 'TFT Backbone',        subtitle: 'Temporal Fusion Transformer',   color: '#58C8E3' },
  { key: 'piTcnCore',         label: 'PI-TCN Core',          subtitle: 'Physics-Informed TCN',          color: '#A371F7' },
  { key: 'liquidNeuralNet',   label: 'Liquid Neural Net',    subtitle: 'Continuous-Time RNN',           color: '#3FB950' },
  { key: 'sslPretrainedBase', label: 'SSL Pre-trained Base', subtitle: 'Self-Supervised Foundation',   color: '#D29922' },
];

const GatedFusionPanel: React.FC<GatedFusionPanelProps> = ({ weights, cmePhase }) => {
  const data = STREAM_CONFIG.map(s => ({
    name: s.label,
    subtitle: s.subtitle,
    weight: parseFloat(((weights[s.key as keyof ModelGateWeights] ?? 0) * 100).toFixed(1)),
    color: s.color,
  }));

  const dominant = data.reduce((a, b) => a.weight > b.weight ? a : b);

  return (
    <div className="bg-space-surface glass-panel rounded-xl border border-space-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-space-purple" />
          <div>
            <h2 className="text-sm font-semibold text-space-text font-mono">GATED FUSION WEIGHTS</h2>
            <p className="text-[10px] text-space-muted">Variable-weight ensemble · Phase: {cmePhase}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-space-muted">Dominant</div>
          <div className="text-xs font-mono text-space-cyan font-bold">{dominant.name}</div>
          <div className="text-[10px] font-mono text-space-muted">{dominant.weight.toFixed(1)}%</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 50, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="2 2" stroke="#1C2333" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 60]}
            tick={{ fill: '#8B949E', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#30363D' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: '#E6EDF3', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Gate Weight']}
            contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
            labelStyle={{ color: '#58C8E3' }}
          />
          <Bar dataKey="weight" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#8B949E', fontSize: 9, fontFamily: 'JetBrains Mono', formatter: (v: any) => `${Number(v).toFixed(1)}%` }}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stream legend row */}
      <div className="grid grid-cols-2 gap-1 mt-2">
        {STREAM_CONFIG.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[9px] font-mono text-space-muted">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span>{s.subtitle}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GatedFusionPanel;

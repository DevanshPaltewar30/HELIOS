// ============================================================
// CME Shock Simulation Engine
// Generates 120-step realistic Coronal Mass Ejection scenario
// ============================================================

import type {
  TelemetryPoint, QuantileBundle, HorizonQuantiles,
  ModelGateWeights, ForecastStep, VSNWeightTable, VSNWeightEntry, SystemAlert
} from '../types/helios.types';

const TOTAL_STEPS = 120;
const THRESHOLD = 3.8; // log10 deep-dielectric charging danger

// ---------- Smooth interpolation helpers ----------
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
function clampedNoise(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

// ---------- Phase boundaries (step index) ----------
// 0-29:  AMBIENT (quiet solar wind)
// 30-44: SHEATH  (compressed turbulent region, Bz oscillates negative)
// 45-79: EJECTA  (main CME body - strong southward Bz, flux dropout then peak)
// 80-119: RECOVERY (field rotates north, flux slowly recovers)

function getCmePhase(i: number): TelemetryPoint['cmePhase'] {
  if (i < 30)  return 'AMBIENT';
  if (i < 45)  return 'SHEATH';
  if (i < 80)  return 'EJECTA';
  return 'RECOVERY';
}

function getPhysicsRegime(flux: number, bz: number, vsw: number): string {
  if (vsw > 650 && bz < -10 && flux < 3.0) return 'Magnetopause Shadowing Dropout';
  if (vsw > 600 && bz < -8 && flux > 3.5)  return 'Storm-Time Acceleration';
  if (vsw > 500 && bz < -5)                 return 'Substorm Injection Active';
  if (flux > 4.0)                            return 'Relativistic Electron Enhancement';
  if (flux < 2.5)                            return 'Flux Dropout / Shadow Loss';
  if (vsw < 420 && Math.abs(bz) < 3)        return 'Quiet Baseline';
  return 'Moderate Activity';
}

// ---------- Generate full 120-step dataset once ----------
export function generateCMETimeSeries(): TelemetryPoint[] {
  const baseDate = new Date('2024-03-14T06:00:00Z');
  const series: TelemetryPoint[] = [];

  for (let i = 0; i < TOTAL_STEPS; i++) {
    const phase = getCmePhase(i);
    const ts = new Date(baseDate.getTime() + i * 5 * 60 * 1000); // 5-min cadence

    let vsw = 400, bz = 0, pdyn = 2.0, flux = 2.8;

    if (phase === 'AMBIENT') {
      const t = i / 29;
      vsw  = 400 + clampedNoise(15) + lerp(0, 60, smoothstep(t));
      bz   = clampedNoise(2.5);
      pdyn = 2.0 + clampedNoise(0.4);
      flux = 2.8 + clampedNoise(0.15) + lerp(0, 0.3, t);
    }

    if (phase === 'SHEATH') {
      const t = (i - 30) / 14;
      vsw  = lerp(460, 720, smoothstep(t)) + clampedNoise(25);
      bz   = lerp(-2, -12, smoothstep(t)) + clampedNoise(4);
      pdyn = lerp(3.0, 18.0, smoothstep(t)) + clampedNoise(1.5);
      // Flux DROPS during sheath (magnetopause compression/shadowing)
      flux = lerp(3.1, 1.8, smoothstep(t)) + clampedNoise(0.2);
    }

    if (phase === 'EJECTA') {
      const t = (i - 45) / 34;
      vsw  = lerp(720, 750, t) + clampedNoise(20);
      // Bz strongly southward mid-ejecta, rotates toward 0 at tail
      bz   = lerp(-15, -3, smoothstep(Math.max(0, t - 0.4) / 0.6)) + clampedNoise(3);
      pdyn = lerp(18, 8, smoothstep(t)) + clampedNoise(1.0);
      // Flux: deep dropout first 40% of ejecta, then powerful acceleration
      if (t < 0.4) {
        flux = lerp(1.8, 1.5, t / 0.4) + clampedNoise(0.15);
      } else {
        flux = lerp(1.5, 4.5, smoothstep((t - 0.4) / 0.6)) + clampedNoise(0.18);
      }
    }

    if (phase === 'RECOVERY') {
      const t = (i - 80) / 39;
      vsw  = lerp(750, 420, smoothstep(t)) + clampedNoise(18);
      bz   = lerp(-3, 2, smoothstep(t)) + clampedNoise(2.0);
      pdyn = lerp(8, 2.5, smoothstep(t)) + clampedNoise(0.6);
      flux = lerp(4.5, 3.6, smoothstep(t)) + clampedNoise(0.12);
    }

    // Newell reconnection rate: Phi = V^(4/3) * Bt^(2/3) * sin^(8/3)(theta/2)
    const bt = Math.abs(bz) + 1;
    const thetaRad = bz < 0 ? Math.PI * 0.8 : Math.PI * 0.2;
    const newellRate = Math.pow(vsw, 4/3) * Math.pow(bt, 2/3) * Math.pow(Math.sin(thetaRad / 2), 8/3) / 1000;

    series.push({
      timestepIndex: i,
      isoTimestamp: ts.toISOString(),
      solarWindVelocity: Math.max(350, vsw),
      bzGSM: Math.max(-20, Math.min(10, bz)),
      dynamicPressure: Math.max(0.5, pdyn),
      newellReconnectionRate: Math.max(0, newellRate),
      electronFluxLog10: Math.max(1.0, Math.min(5.0, flux)),
      cmePhase: phase,
      physicsRegime: getPhysicsRegime(flux, bz, vsw)
    });
  }

  return series;
}

// ---------- Quantile / Pinball-loss spread ----------
function pinballSpread(volatility: number, horizon: number): number {
  // Wider spread for higher volatility and longer horizons
  return 0.15 + volatility * 0.6 + (horizon / 720) * 0.4;
}

function buildQuantiles(p50: number, spread: number): HorizonQuantiles {
  return {
    p10: p50 - spread * 1.4,
    p25: p50 - spread * 0.7,
    p50,
    p75: p50 + spread * 0.7,
    p90: p50 + spread * 1.4,
  };
}

export function generateQuantileBundle(
  point: TelemetryPoint,
  series: TelemetryPoint[]
): QuantileBundle {
  const i = point.timestepIndex;
  // Volatility = recent Bz rate of change + vsw deviation from 400
  const recent = series.slice(Math.max(0, i - 5), i + 1);
  const bzDelta = recent.length > 1
    ? Math.abs(recent[recent.length - 1].bzGSM - recent[0].bzGSM) / recent.length
    : 0;
  const vswDev = Math.abs(point.solarWindVelocity - 400) / 350;
  const volatility = Math.min(1.0, bzDelta / 8 + vswDev * 0.5);

  const base = point.electronFluxLog10;
  // Look-ahead projections with lag physics
  const projected30 = base + (point.bzGSM < -5 ? -0.3 : 0.1) * volatility;
  const projected45 = base + (point.bzGSM < -5 ? -0.2 : 0.15) * volatility;
  const projected6h  = Math.min(4.5, base + (volatility > 0.5 ? 1.2 * volatility : 0.3));
  const projected12h = Math.min(4.5, base + (volatility > 0.5 ? 0.9 * volatility : 0.2));

  const weights = generateGateWeights(point);

  return {
    timestepIndex: i,
    horizon30min: buildQuantiles(projected30, pinballSpread(volatility, 30)),
    horizon45min: buildQuantiles(projected45, pinballSpread(volatility, 45)),
    horizon6hr:   buildQuantiles(projected6h,  pinballSpread(volatility, 360)),
    horizon12hr:  buildQuantiles(projected12h, pinballSpread(volatility, 720)),
    gatedWeights: weights
  };
}

export function generateForecastSteps(
  currentPoint: TelemetryPoint,
  series: TelemetryPoint[]
): ForecastStep[] {
  const horizons = [
    { label: '+30min', minutes: 30 },
    { label: '+45min', minutes: 45 },
    { label: '+6hr',   minutes: 360 },
    { label: '+12hr',  minutes: 720 },
  ];

  const bundle = generateQuantileBundle(currentPoint, series);

  return horizons.map(h => {
    let q: HorizonQuantiles;
    if (h.minutes === 30)  q = bundle.horizon30min;
    else if (h.minutes === 45) q = bundle.horizon45min;
    else if (h.minutes === 360) q = bundle.horizon6hr;
    else q = bundle.horizon12hr;

    const exceedProb = q.p90 > THRESHOLD
      ? Math.min(99, Math.round(((q.p50 - THRESHOLD) / (q.p90 - q.p50 + 0.001)) * 50 + 50))
      : Math.max(1, Math.round(((q.p50 - THRESHOLD) / (THRESHOLD - q.p10 + 0.001)) * 30 + 15));

    return {
      horizonLabel: h.label,
      horizonMinutes: h.minutes,
      ...q,
      exceedanceProbability: Math.max(1, Math.min(99, exceedProb))
    };
  });
}

// ---------- Gated fusion weights ----------
export function generateGateWeights(point: TelemetryPoint): ModelGateWeights {
  const phase = point.cmePhase;
  // Weights shift based on physics phase (must sum to 1.0)
  const phaseWeightMap: Record<string, ModelGateWeights> = {
    AMBIENT:  { tftBackbone: 0.40, piTcnCore: 0.25, liquidNeuralNet: 0.20, sslPretrainedBase: 0.15 },
    SHEATH:   { tftBackbone: 0.25, piTcnCore: 0.40, liquidNeuralNet: 0.25, sslPretrainedBase: 0.10 },
    EJECTA:   { tftBackbone: 0.15, piTcnCore: 0.30, liquidNeuralNet: 0.45, sslPretrainedBase: 0.10 },
    RECOVERY: { tftBackbone: 0.35, piTcnCore: 0.20, liquidNeuralNet: 0.20, sslPretrainedBase: 0.25 },
  };
  const base = phaseWeightMap[phase];
  // Add small noise to simulate live gate adaptation
  const noise = () => (Math.random() - 0.5) * 0.04;
  const raw = {
    tftBackbone:       Math.max(0.05, base.tftBackbone + noise()),
    piTcnCore:         Math.max(0.05, base.piTcnCore + noise()),
    liquidNeuralNet:   Math.max(0.05, base.liquidNeuralNet + noise()),
    sslPretrainedBase: Math.max(0.05, base.sslPretrainedBase + noise()),
  };
  const total = raw.tftBackbone + raw.piTcnCore + raw.liquidNeuralNet + raw.sslPretrainedBase;
  return {
    tftBackbone:       parseFloat((raw.tftBackbone / total).toFixed(4)),
    piTcnCore:         parseFloat((raw.piTcnCore / total).toFixed(4)),
    liquidNeuralNet:   parseFloat((raw.liquidNeuralNet / total).toFixed(4)),
    sslPretrainedBase: parseFloat((raw.sslPretrainedBase / total).toFixed(4)),
  };
}

// ---------- VSN Feature Importance ----------
export function generateVSNWeights(point: TelemetryPoint): VSNWeightTable {
  const isBzDominated = point.bzGSM < -5;
  const isHighVelocity = point.solarWindVelocity > 550;

  const encoder: VSNWeightEntry[] = [
    {
      variableName: 'Newell Reconnection Rate',
      scientificSymbol: 'Φ_N',
      weight: isBzDominated ? 0.28 + Math.random() * 0.05 : 0.14 + Math.random() * 0.03,
      rank: 1, trend: isBzDominated ? 'RISING' : 'STABLE', unit: 'kV'
    },
    {
      variableName: 'IMF Bz Component',
      scientificSymbol: 'B_z GSM',
      weight: isBzDominated ? 0.22 + Math.random() * 0.04 : 0.10 + Math.random() * 0.03,
      rank: 2, trend: isBzDominated ? 'RISING' : 'FALLING', unit: 'nT'
    },
    {
      variableName: 'Solar Wind Velocity',
      scientificSymbol: 'V_sw',
      weight: isHighVelocity ? 0.18 + Math.random() * 0.03 : 0.12 + Math.random() * 0.02,
      rank: 3, trend: isHighVelocity ? 'RISING' : 'STABLE', unit: 'km/s'
    },
    {
      variableName: 'Dynamic Pressure',
      scientificSymbol: 'P_dyn',
      weight: 0.12 + Math.random() * 0.03,
      rank: 4, trend: point.dynamicPressure > 10 ? 'RISING' : 'STABLE', unit: 'nPa'
    },
    {
      variableName: 'Dst Index (proxy)',
      scientificSymbol: 'Dst*',
      weight: 0.10 + Math.random() * 0.02,
      rank: 5, trend: 'FALLING', unit: 'nT'
    },
    {
      variableName: 'Kp Index (proxy)',
      scientificSymbol: 'Kp*',
      weight: 0.08 + Math.random() * 0.02,
      rank: 6, trend: 'STABLE', unit: '-'
    },
    {
      variableName: 'Solar Wind Density',
      scientificSymbol: 'N_p',
      weight: 0.02 + Math.random() * 0.01,
      rank: 7, trend: 'STABLE', unit: 'cm⁻³'
    },
  ];

  // Normalize weights to sum to 1
  const total = encoder.reduce((s, e) => s + e.weight, 0);
  encoder.forEach(e => { e.weight = parseFloat((e.weight / total).toFixed(4)); });
  encoder.sort((a, b) => b.weight - a.weight);
  encoder.forEach((e, idx) => { e.rank = idx + 1; });

  const decoder: VSNWeightEntry[] = encoder.map(e => ({
    ...e,
    weight: parseFloat((e.weight * (0.8 + Math.random() * 0.4)).toFixed(4))
  }));
  const dtotal = decoder.reduce((s, e) => s + e.weight, 0);
  decoder.forEach(e => { e.weight = parseFloat((e.weight / dtotal).toFixed(4)); });

  return {
    encoderWeights: encoder,
    decoderWeights: decoder,
    timestamp: new Date().toISOString()
  };
}

// ---------- Evaluation Metrics ----------
export function generateEvaluationMetrics(point: TelemetryPoint): import('../types/helios.types').EvaluationMetrics {
  const noise = (Math.random() - 0.5) * 0.05;
  const isStorm = point.electronFluxLog10 > 3.8;
  
  const pe = Math.min(0.95, Math.max(0.70, 0.88 + noise));
  const rmseLog = Math.max(0.1, 0.22 + noise * 0.5);
  
  const hits = isStorm ? 42 + Math.floor(noise*10) : 12;
  const misses = isStorm ? 3 : 5;
  const falseAlarms = 8;
  const correctNegatives = isStorm ? 80 : 120;
  
  const h = hits, m = misses, f = falseAlarms, c = correctNegatives;
  const tss = (h / (h + m)) - (f / (f + c));
  const hss = (2 * (h * c - m * f)) / ((h + m) * (m + c) + (h + f) * (f + c));
  const pod = h / (h + m);
  const far = f / (h + f);
  
  const linexLoss = 0.45 + noise;
  const pinballLoss = 0.18 + noise * 0.2;
  const crps = 0.12 + noise * 0.1;
  const epsilonTau = 4.2 + noise * 10;
  
  return {
    pe: parseFloat(pe.toFixed(3)),
    rmseLog: parseFloat(rmseLog.toFixed(3)),
    tss: parseFloat(tss.toFixed(3)),
    hss: parseFloat(hss.toFixed(3)),
    pod: parseFloat(pod.toFixed(3)),
    far: parseFloat(far.toFixed(3)),
    linexLoss: parseFloat(linexLoss.toFixed(3)),
    pinballLoss: parseFloat(pinballLoss.toFixed(3)),
    crps: parseFloat(crps.toFixed(3)),
    epsilonTau: parseFloat(epsilonTau.toFixed(1)),
    confusionMatrix: { hits, misses, falseAlarms, correctNegatives }
  };
}

export function buildAlerts(flux: number, bz: number, vsw: number, pdyn: number): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const now = new Date().toISOString();
  const THRESHOLD = 3.8;

  if (flux > THRESHOLD) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'CRITICAL',
      message: `Deep-dielectric charging risk ACTIVE. Flux exceeds ${THRESHOLD} log10.`,
      triggeredAt: now,
      parameter: 'electronFluxLog10',
      value: flux,
      threshold: THRESHOLD
    });
  } else if (flux > THRESHOLD - 0.3) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'WARNING',
      message: `Flux approaching charging threshold (${(flux).toFixed(2)} log10).`,
      triggeredAt: now,
      parameter: 'electronFluxLog10',
      value: flux,
      threshold: THRESHOLD
    });
  }

  if (bz < -10) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'CRITICAL',
      message: `Sustained strongly southward Bz (${bz.toFixed(1)} nT) — ring current injection likely.`,
      triggeredAt: now,
      parameter: 'bzGSM',
      value: bz,
      threshold: -10
    });
  } else if (bz < -5) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'WARNING',
      message: `Southward Bz (${bz.toFixed(1)} nT) — geomagnetic activity elevated.`,
      triggeredAt: now,
      parameter: 'bzGSM',
      value: bz,
      threshold: -5
    });
  }

  if (vsw > 650) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'WARNING',
      message: `High solar wind velocity detected: ${vsw.toFixed(0)} km/s.`,
      triggeredAt: now,
      parameter: 'solarWindVelocity',
      value: vsw,
      threshold: 650
    });
  }

  if (pdyn > 15) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'WARNING',
      message: `Dynamic pressure surge: ${pdyn.toFixed(1)} nPa — magnetopause compression expected.`,
      triggeredAt: now,
      parameter: 'dynamicPressure',
      value: pdyn,
      threshold: 15
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      alertId: "alert-" + Math.random(),
      severity: 'INFO',
      message: 'All parameters within nominal operational bounds.',
      triggeredAt: now,
      parameter: 'system',
      value: 0,
      threshold: 0
    });
  }

  return alerts;
}

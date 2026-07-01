// ============================================================
// Telemetry Stream Router - /api/telemetry/stream
// ============================================================

import { Router, Request, Response } from 'express';
import {
  generateCMETimeSeries, generateQuantileBundle,
  generateForecastSteps, generateVSNWeights, generateEvaluationMetrics
} from '../engine/cmeSimulation';
import { TelemetryStreamResponse, SystemAlert } from '../types/helios.types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Singleton time-series so each request shares same deterministic data
const CME_SERIES = generateCMETimeSeries();
const THRESHOLD = 3.8;

function buildAlerts(flux: number, bz: number, vsw: number, pdyn: number): SystemAlert[] {
  const alerts: SystemAlert[] = [];
  const now = new Date().toISOString();

  if (flux > THRESHOLD) {
    alerts.push({
      alertId: uuidv4(),
      severity: 'CRITICAL',
      message: `Deep-dielectric charging risk ACTIVE. Flux exceeds ${THRESHOLD} log10.`,
      triggeredAt: now,
      parameter: 'electronFluxLog10',
      value: flux,
      threshold: THRESHOLD
    });
  } else if (flux > THRESHOLD - 0.3) {
    alerts.push({
      alertId: uuidv4(),
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
      alertId: uuidv4(),
      severity: 'CRITICAL',
      message: `Sustained strongly southward Bz (${bz.toFixed(1)} nT) — ring current injection likely.`,
      triggeredAt: now,
      parameter: 'bzGSM',
      value: bz,
      threshold: -10
    });
  } else if (bz < -5) {
    alerts.push({
      alertId: uuidv4(),
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
      alertId: uuidv4(),
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
      alertId: uuidv4(),
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
      alertId: uuidv4(),
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

// GET /api/telemetry/stream?step=N
router.get('/stream', (req: Request, res: Response) => {
  const rawStep = parseInt((req.query.step as string) ?? '0', 10);
  const step = Math.max(0, Math.min(rawStep, CME_SERIES.length - 1));
  const currentPoint = CME_SERIES[step];

  const historyWindow = CME_SERIES.slice(Math.max(0, step - 29), step + 1);
  const forecastSteps = generateForecastSteps(currentPoint, CME_SERIES, step);
  const quantileBundle = generateQuantileBundle(currentPoint, CME_SERIES);
  const vsnWeights = generateVSNWeights(currentPoint);
  const systemAlerts = buildAlerts(
    currentPoint.electronFluxLog10,
    currentPoint.bzGSM,
    currentPoint.solarWindVelocity,
    currentPoint.dynamicPressure
  );
  const evaluationMetrics = generateEvaluationMetrics(currentPoint);

  const response: TelemetryStreamResponse = {
    currentStep: step,
    totalSteps: CME_SERIES.length,
    history: historyWindow,
    forecast: {
      steps: forecastSteps,
      horizonLabels: forecastSteps.map(f => f.horizonLabel)
    },
    quantileBundle,
    vsnWeights,
    systemAlerts,
    evaluationMetrics
  };

  res.json(response);
});

// GET /api/telemetry/full — return entire series metadata
router.get('/full', (_req: Request, res: Response) => {
  res.json({
    totalSteps: CME_SERIES.length,
    epochStart: CME_SERIES[0].isoTimestamp,
    epochEnd: CME_SERIES[CME_SERIES.length - 1].isoTimestamp,
    cadenceMinutes: 5,
    phases: [
      { name: 'AMBIENT', startStep: 0, endStep: 29 },
      { name: 'SHEATH', startStep: 30, endStep: 44 },
      { name: 'EJECTA', startStep: 45, endStep: 79 },
      { name: 'RECOVERY', startStep: 80, endStep: 119 },
    ]
  });
});

export default router;

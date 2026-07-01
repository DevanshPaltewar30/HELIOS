// ============================================================
// API Service Layer - Mock Frontend-Only API
// ============================================================

import type {
  TelemetryStreamResponse,
  LongitudeAlignmentEntry,
  CDFUploadResult
} from '../types/helios.types';

import {
  generateCMETimeSeries,
  generateForecastSteps,
  generateQuantileBundle,
  generateVSNWeights,
  generateEvaluationMetrics,
  buildAlerts
} from './mockEngine';

const CME_SERIES = generateCMETimeSeries();

export async function fetchTelemetryStream(step: number): Promise<TelemetryStreamResponse> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 100));

  const validStep = Math.max(0, Math.min(step, CME_SERIES.length - 1));
  const currentPoint = CME_SERIES[validStep];

  const historyWindow = CME_SERIES.slice(Math.max(0, validStep - 29), validStep + 1);
  const forecastSteps = generateForecastSteps(currentPoint, CME_SERIES);
  const quantileBundle = generateQuantileBundle(currentPoint, CME_SERIES);
  const vsnWeights = generateVSNWeights(currentPoint);
  const systemAlerts = buildAlerts(
    currentPoint.electronFluxLog10,
    currentPoint.bzGSM,
    currentPoint.solarWindVelocity,
    currentPoint.dynamicPressure
  );
  const evaluationMetrics = generateEvaluationMetrics(currentPoint);

  return {
    currentStep: validStep,
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
}

export async function fetchFullSeriesMetadata(): Promise<{
  totalSteps: number;
  epochStart: string;
  epochEnd: string;
  cadenceMinutes: number;
  phases: Array<{ name: string; startStep: number; endStep: number }>;
}> {
  return {
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
  };
}

export async function fetchLongitudeMatrix(): Promise<{
  matrix: LongitudeAlignmentEntry[];
  referenceBaseline: string;
  generatedAt: string;
  method: string;
}> {
  return {
    matrix: [],
    referenceBaseline: 'Earth-L1',
    generatedAt: new Date().toISOString(),
    method: 'MOCK_STATIC'
  };
}

export async function uploadCDFFile(file: File): Promise<CDFUploadResult> {
  return {
    uploadId: "mock-" + Math.random(),
    filename: file.name,
    fileSizeBytes: file.size,
    processingSteps: [],
    detectedVariables: [],
    epochStart: new Date().toISOString(),
    epochEnd: new Date().toISOString(),
    totalRecords: 120,
    missingEpochs: 0,
    coordinateSystem: "GSM",
    status: 'SUCCESS'
  };
}

export async function checkBackendHealth(): Promise<boolean> {
  return true;
}

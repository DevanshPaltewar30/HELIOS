// ============================================================
// HELIOS Backend - Shared TypeScript Types
// Heliophysics-Embedded Longitude-Invariant Operational
// Sequence Forecaster (ISRO Hackathon PS-14)
// ============================================================

export interface TelemetryPoint {
  timestepIndex: number;
  isoTimestamp: string;
  // Solar Wind Drivers
  solarWindVelocity: number;       // km/s
  bzGSM: number;                   // nT (southward negative)
  dynamicPressure: number;         // nPa
  newellReconnectionRate: number;  // kV (dimensionless coupling index)
  // Electron Flux
  electronFluxLog10: number;       // log10(flux) in particles/cm²/s/sr
  // CME Phase metadata
  cmePhase: 'AMBIENT' | 'SHEATH' | 'EJECTA' | 'RECOVERY';
  physicsRegime: string;
}

export interface QuantileBundle {
  timestepIndex: number;
  horizon30min: HorizonQuantiles;
  horizon45min: HorizonQuantiles;
  horizon6hr: HorizonQuantiles;
  horizon12hr: HorizonQuantiles;
  gatedWeights: ModelGateWeights;
}

export interface HorizonQuantiles {
  p10: number;  // 10th percentile log10 flux
  p25: number;  // 25th percentile log10 flux
  p50: number;  // 50th percentile (median) log10 flux
  p75: number;  // 75th percentile log10 flux
  p90: number;  // 90th percentile log10 flux
}

export interface ModelGateWeights {
  tftBackbone: number;       // Stream 1 - TFT Backbone
  piTcnCore: number;         // Stream 2 - PI-TCN Core
  liquidNeuralNet: number;   // Stream 3 - Liquid Neural Network
  sslPretrainedBase: number; // Stream 4 - SSL Pre-trained Base
}

export interface EvaluationMetrics {
  pe: number;
  rmseLog: number;
  tss: number;
  hss: number;
  pod: number;
  far: number;
  linexLoss: number;
  pinballLoss: number;
  crps: number;
  epsilonTau: number;
  confusionMatrix: {
    hits: number;
    misses: number;
    falseAlarms: number;
    correctNegatives: number;
  };
}

export interface TelemetryStreamResponse {
  currentStep: number;
  totalSteps: number;
  history: TelemetryPoint[];
  forecast: ForecastWindow;
  quantileBundle: QuantileBundle;
  vsnWeights: VSNWeightTable;
  systemAlerts: SystemAlert[];
  evaluationMetrics: EvaluationMetrics;
}

export interface ForecastWindow {
  steps: ForecastStep[];
  horizonLabels: string[];
}

export interface ForecastStep {
  horizonLabel: string;   // e.g. "+30min"
  horizonMinutes: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  exceedanceProbability: number;  // % chance of exceeding 3.8 log10 threshold
}

export interface VSNWeightEntry {
  variableName: string;
  scientificSymbol: string;
  weight: number;           // 0-1 normalised importance
  rank: number;
  trend: 'RISING' | 'FALLING' | 'STABLE';
  unit: string;
}

export interface VSNWeightTable {
  encoderWeights: VSNWeightEntry[];
  decoderWeights: VSNWeightEntry[];
  timestamp: string;
}

export interface SystemAlert {
  alertId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  triggeredAt: string;
  parameter: string;
  value: number;
  threshold: number;
}

export interface LongitudeAlignmentEntry {
  satelliteId: string;
  agency: 'NOAA/GOES' | 'ISRO/GRASP' | 'ISRO/GSAT';
  longitudeDeg: number;
  correlationWithGOES: number;   // Pearson r coefficient
  lagMinutes: number;            // Optimal cross-correlation lag
  rmse: number;                  // Root mean square error in dex
  dataAvailability: number;      // % data completeness
  orbitType: 'GEO' | 'MEO' | 'LEO';
}

export interface CDFUploadResult {
  uploadId: string;
  filename: string;
  fileSizeBytes: number;
  processingSteps: CDFProcessingStep[];
  detectedVariables: string[];
  epochStart: string;
  epochEnd: string;
  totalRecords: number;
  missingEpochs: number;
  coordinateSystem: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

export interface CDFProcessingStep {
  stepName: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'ERROR';
  durationMs: number;
  detail: string;
}

export interface TelemetryPoint {
    timestepIndex: number;
    isoTimestamp: string;
    solarWindVelocity: number;
    bzGSM: number;
    dynamicPressure: number;
    newellReconnectionRate: number;
    electronFluxLog10: number;
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
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
}
export interface ModelGateWeights {
    tftBackbone: number;
    piTcnCore: number;
    liquidNeuralNet: number;
    sslPretrainedBase: number;
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
    horizonLabel: string;
    horizonMinutes: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    exceedanceProbability: number;
}
export interface VSNWeightEntry {
    variableName: string;
    scientificSymbol: string;
    weight: number;
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
    correlationWithGOES: number;
    lagMinutes: number;
    rmse: number;
    dataAvailability: number;
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
//# sourceMappingURL=helios.types.d.ts.map
import { TelemetryPoint, QuantileBundle, ModelGateWeights, ForecastStep, VSNWeightTable } from '../types/helios.types';
export declare function generateCMETimeSeries(): TelemetryPoint[];
export declare function generateQuantileBundle(point: TelemetryPoint, series: TelemetryPoint[]): QuantileBundle;
export declare function generateForecastSteps(currentPoint: TelemetryPoint, series: TelemetryPoint[], currentIndex: number): ForecastStep[];
export declare function generateGateWeights(point: TelemetryPoint): ModelGateWeights;
export declare function generateVSNWeights(point: TelemetryPoint): VSNWeightTable;
//# sourceMappingURL=cmeSimulation.d.ts.map
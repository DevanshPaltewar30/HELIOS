// ============================================================
// API Service Layer - Axios-based typed API calls
// ============================================================

import axios from 'axios';
import type {
  TelemetryStreamResponse,
  LongitudeAlignmentEntry,
  CDFUploadResult
} from '../types/helios.types';

const BASE = 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE, timeout: 10000 });

export async function fetchTelemetryStream(step: number): Promise<TelemetryStreamResponse> {
  const { data } = await api.get<TelemetryStreamResponse>(`/telemetry/stream?step=${step}`);
  return data;
}

export async function fetchFullSeriesMetadata(): Promise<{
  totalSteps: number;
  epochStart: string;
  epochEnd: string;
  cadenceMinutes: number;
  phases: Array<{ name: string; startStep: number; endStep: number }>;
}> {
  const { data } = await api.get('/telemetry/full');
  return data;
}

export async function fetchLongitudeMatrix(): Promise<{
  matrix: LongitudeAlignmentEntry[];
  referenceBaseline: string;
  generatedAt: string;
  method: string;
}> {
  const { data } = await api.get('/data/longitude-matrix');
  return data;
}

export async function uploadCDFFile(file: File): Promise<CDFUploadResult> {
  const form = new FormData();
  form.append('cdfFile', file);
  const { data } = await api.post<CDFUploadResult>('/data/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
}

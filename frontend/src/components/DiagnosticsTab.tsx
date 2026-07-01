// ============================================================
// DiagnosticsTab — CDF upload + Longitude alignment matrix
// ============================================================

import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, Clock, XCircle, AlertCircle, Satellite, RefreshCw } from 'lucide-react';
import { uploadCDFFile, fetchLongitudeMatrix } from '../api/heliosApi';
import type { CDFUploadResult, LongitudeAlignmentEntry, CDFProcessingStep } from '../types/helios.types';

interface DiagnosticsTabProps {
  onMessage: (msg: string) => void;
}

const StatusIcon: React.FC<{ status: CDFProcessingStep['status'] }> = ({ status }) => {
  if (status === 'COMPLETE') return <CheckCircle size={12} className="text-space-green" />;
  if (status === 'RUNNING')  return <RefreshCw  size={12} className="text-space-cyan animate-spin" />;
  if (status === 'ERROR')    return <XCircle    size={12} className="text-space-red" />;
  return <Clock size={12} className="text-space-muted" />;
};

function agencyColor(agency: string): string {
  if (agency.startsWith('NOAA')) return '#58C8E3';
  if (agency.includes('GRASP'))  return '#A371F7';
  return '#3FB950';
}

function corrBar(r: number): React.ReactElement {
  const pct = Math.round(r * 100);
  const color = r > 0.9 ? '#3FB950' : r > 0.8 ? '#D29922' : '#F85149';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-space-panel rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-[11px]" style={{ color }}>{r.toFixed(3)}</span>
    </div>
  );
}

const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ onMessage }) => {
  const [isDragging, setIsDragging]   = useState(false);
  const [uploadResult, setUploadResult] = useState<CDFUploadResult | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [lonMatrix, setLonMatrix]     = useState<LongitudeAlignmentEntry[]>([]);
  const [lonMeta, setLonMeta]         = useState<{ referenceBaseline: string; method: string } | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await processFile(file);
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }, []);

  async function processFile(file: File) {
    setUploading(true);
    onMessage(`Uploading ${file.name}...`);
    try {
      const result = await uploadCDFFile(file);
      setUploadResult(result);
      onMessage(`CDF parsed: ${result.totalRecords} records · Status: ${result.status}`);
    } catch {
      onMessage('CDF upload failed — ensure backend is running');
    } finally {
      setUploading(false);
    }
  }

  async function loadLonMatrix() {
    setLoadingMatrix(true);
    try {
      const res = await fetchLongitudeMatrix();
      setLonMatrix(res.matrix);
      setLonMeta({ referenceBaseline: res.referenceBaseline, method: res.method });
    } catch {
      onMessage('Failed to fetch longitude alignment matrix');
    } finally {
      setLoadingMatrix(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* CDF Upload Zone */}
      <div className="bg-space-surface glass-panel rounded-xl border border-space-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={14} className="text-space-cyan" />
          <div>
            <h2 className="text-sm font-semibold text-space-text font-mono">CDF DATA INGESTION PIPELINE</h2>
            <p className="text-[10px] text-space-muted">NASA/ISTP CDF binary · Drag & drop or click to upload</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
            ${isDragging ? 'border-space-cyan bg-space-cyan/5' : 'border-space-border hover:border-space-cyan/50 hover:bg-space-panel/40'}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('cdf-file-input')?.click()}
        >
          <input id="cdf-file-input" type="file" className="hidden" accept=".cdf,.bin,.dat" onChange={handleFileInput} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw size={32} className="text-space-cyan animate-spin" />
              <p className="text-sm font-mono text-space-cyan">Processing CDF binary...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={32} className={isDragging ? 'text-space-cyan' : 'text-space-muted'} />
              <p className="text-sm font-mono text-space-text">Drop CDF file here or click to browse</p>
              <p className="text-[10px] font-mono text-space-muted">Accepts .cdf · Max 50 MB · ISTP/IACG compliant</p>
            </div>
          )}
        </div>

        {/* Processing checklist */}
        {uploadResult && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-mono text-space-cyan uppercase tracking-widest mb-2">Processing Pipeline</div>
              <div className="space-y-1.5">
                {uploadResult.processingSteps.map(step => (
                  <div key={step.stepName} className="flex items-start gap-2 bg-space-panel rounded-lg px-3 py-2">
                    <StatusIcon status={step.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono text-space-text truncate">{step.stepName}</div>
                      <div className="text-[9px] font-mono text-space-muted truncate">{step.detail}</div>
                    </div>
                    <div className="text-[9px] font-mono text-space-muted flex-shrink-0">{step.durationMs}ms</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-space-cyan uppercase tracking-widest mb-2">File Metadata</div>
              <div className="space-y-1 text-[11px] font-mono">
                {[
                  ['Upload ID',     uploadResult.uploadId.slice(0, 8) + '...'],
                  ['File',          uploadResult.filename],
                  ['Size',          `${(uploadResult.fileSizeBytes / 1024).toFixed(1)} KB`],
                  ['Records',       uploadResult.totalRecords.toString()],
                  ['Missing Epochs',`${uploadResult.missingEpochs} gaps`],
                  ['Epoch Start',   new Date(uploadResult.epochStart).toUTCString().slice(0, 25)],
                  ['Epoch End',     new Date(uploadResult.epochEnd).toUTCString().slice(0, 25)],
                  ['Coordinates',   uploadResult.coordinateSystem],
                  ['Detected Vars', uploadResult.detectedVariables.length.toString()],
                  ['Status',        uploadResult.status],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-space-border py-0.5">
                    <span className="text-space-muted">{k}</span>
                    <span className={`text-right ${k === 'Status' ? (v === 'SUCCESS' ? 'text-space-green' : 'text-space-yellow') : 'text-space-text'}`}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <div className="text-[9px] font-mono text-space-muted mb-1">Detected Variables:</div>
                <div className="flex flex-wrap gap-1">
                  {uploadResult.detectedVariables.map(v => (
                    <span key={v} className="text-[9px] font-mono bg-space-panel px-1.5 py-0.5 rounded text-space-cyan">{v}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Longitude Alignment Matrix */}
      <div className="bg-space-surface glass-panel rounded-xl border border-space-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Satellite size={14} className="text-space-green" />
            <div>
              <h2 className="text-sm font-semibold text-space-text font-mono">ISRO LONGITUDE ALIGNMENT MATRIX</h2>
              <p className="text-[10px] text-space-muted">GRASP/GSAT cross-correlation vs GOES baseline</p>
            </div>
          </div>
          <button
            id="load-longitude-matrix-btn"
            onClick={loadLonMatrix}
            disabled={loadingMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-space-panel hover:bg-space-border text-space-cyan text-[11px] font-mono rounded-lg border border-space-border transition-all"
          >
            <RefreshCw size={11} className={loadingMatrix ? 'animate-spin' : ''} />
            {loadingMatrix ? 'Loading...' : 'Load Matrix'}
          </button>
        </div>

        {lonMeta && (
          <div className="text-[9px] font-mono text-space-muted mb-3">
            Reference: <span className="text-space-cyan">{lonMeta.referenceBaseline}</span> ·
            Method: <span className="text-space-text">{lonMeta.method}</span>
          </div>
        )}

        {lonMatrix.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-space-border">
                  {['Satellite', 'Agency', 'Longitude', 'Orbit', 'r (GOES)', 'Lag', 'RMSE', 'Avail.'].map(h => (
                    <th key={h} className="text-left text-space-muted py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lonMatrix.map(entry => (
                  <tr key={entry.satelliteId} className="vsn-row border-b border-space-border">
                    <td className="py-2 pr-4 text-space-text font-bold">{entry.satelliteId}</td>
                    <td className="py-2 pr-4" style={{ color: agencyColor(entry.agency) }}>{entry.agency}</td>
                    <td className="py-2 pr-4 text-space-muted">{entry.longitudeDeg > 0 ? '+' : ''}{entry.longitudeDeg.toFixed(1)}°</td>
                    <td className="py-2 pr-4 text-space-muted">{entry.orbitType}</td>
                    <td className="py-2 pr-4">{corrBar(entry.correlationWithGOES)}</td>
                    <td className="py-2 pr-4 text-space-cyan">{entry.lagMinutes.toFixed(1)} min</td>
                    <td className="py-2 pr-4 text-space-yellow">{entry.rmse.toFixed(3)} dex</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-8 bg-space-panel rounded h-1">
                          <div className="h-1 rounded bg-space-green" style={{ width: `${entry.dataAvailability}%` }} />
                        </div>
                        <span className="text-space-green">{entry.dataAvailability.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-space-muted gap-2">
            <AlertCircle size={24} />
            <p className="text-sm font-mono">Click "Load Matrix" to fetch longitude alignment data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticsTab;

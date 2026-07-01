// ============================================================
// Data Ingestion Router - /api/data/upload
// Mocks NASA/ISTP CDF binary parsing pipeline
// ============================================================

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { CDFUploadResult, CDFProcessingStep, LongitudeAlignmentEntry } from '../types/helios.types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function simulateCDFProcessing(filename: string, fileSizeBytes: number): CDFProcessingStep[] {
  return [
    {
      stepName: 'CDF Header Parse',
      description: 'Read ISTP/IACG attribute metadata and variable descriptors',
      status: 'COMPLETE',
      durationMs: 42,
      detail: 'Found 14 variable attributes; ISTP compliance: PASS'
    },
    {
      stepName: 'Epoch Coordinate Transform',
      description: 'Convert CDF_EPOCH (ms since 0 AD) → ISO-8601 UTC',
      status: 'COMPLETE',
      durationMs: 18,
      detail: 'TT2000 → UTC offset applied: +69.184s leap-second correction'
    },
    {
      stepName: 'MAD + Hampel Despiking',
      description: 'Median Absolute Deviation filter (k=3σ) + Hampel identifier sliding window (w=7)',
      status: 'COMPLETE',
      durationMs: 135,
      detail: `Detected 12 outlier spikes; replaced with windowed median interpolation`
    },
    {
      stepName: 'Linear Epoch Interpolation',
      description: 'Fill missing cadence gaps with linear interpolation between bracketing records',
      status: 'COMPLETE',
      durationMs: 67,
      detail: 'Interpolated 3 gap segments totalling 15 minutes of missing data'
    },
    {
      stepName: 'Ballistic Transit Alignment',
      description: 'Compute propagation delay Δt = d / V_sw from L1 (1.5e6 km) to magnetopause',
      status: 'COMPLETE',
      durationMs: 28,
      detail: 'Mean V_sw = 487 km/s → Δt ≈ 51.1 min; timestamps shifted forward'
    },
    {
      stepName: 'GSE → GSM Coordinate Rotation',
      description: 'Rotate vector magnetic field from Geocentric Solar Ecliptic to Geocentric Solar Magnetospheric',
      status: 'COMPLETE',
      durationMs: 22,
      detail: `Dipole tilt angle: ${(Math.random() * 10 + 15).toFixed(1)}°; rotation matrix applied to B-field vectors`
    },
    {
      stepName: 'Quality Flag Audit',
      description: 'Filter records with FILLVAL or bad quality_flag (>0)',
      status: 'COMPLETE',
      durationMs: 14,
      detail: `Flagged 8 records (0.2%) as FILL; excluded from downstream pipeline`
    }
  ];
}

// Longitude alignment matrix — static + small dynamic perturbation
function buildLongitudeMatrix(): LongitudeAlignmentEntry[] {
  const jitter = () => (Math.random() - 0.5) * 0.04;
  return [
    {
      satelliteId: 'GOES-16',
      agency: 'NOAA/GOES',
      longitudeDeg: -75.2,
      correlationWithGOES: 1.000,
      lagMinutes: 0,
      rmse: 0.000,
      dataAvailability: 99.7,
      orbitType: 'GEO'
    },
    {
      satelliteId: 'GOES-18',
      agency: 'NOAA/GOES',
      longitudeDeg: -137.0,
      correlationWithGOES: parseFloat((0.961 + jitter()).toFixed(3)),
      lagMinutes: parseFloat((18.4 + Math.random() * 2).toFixed(1)),
      rmse: parseFloat((0.19 + Math.random() * 0.04).toFixed(3)),
      dataAvailability: 99.1,
      orbitType: 'GEO'
    },
    {
      satelliteId: 'GSAT-31',
      agency: 'ISRO/GSAT',
      longitudeDeg: 48.0,
      correlationWithGOES: parseFloat((0.834 + jitter()).toFixed(3)),
      lagMinutes: parseFloat((34.2 + Math.random() * 3).toFixed(1)),
      rmse: parseFloat((0.31 + Math.random() * 0.05).toFixed(3)),
      dataAvailability: 97.3,
      orbitType: 'GEO'
    },
    {
      satelliteId: 'GSAT-7A',
      agency: 'ISRO/GSAT',
      longitudeDeg: 93.5,
      correlationWithGOES: parseFloat((0.801 + jitter()).toFixed(3)),
      lagMinutes: parseFloat((41.7 + Math.random() * 4).toFixed(1)),
      rmse: parseFloat((0.38 + Math.random() * 0.06).toFixed(3)),
      dataAvailability: 96.8,
      orbitType: 'GEO'
    },
    {
      satelliteId: 'GRASP-1',
      agency: 'ISRO/GRASP',
      longitudeDeg: 82.1,
      correlationWithGOES: parseFloat((0.776 + jitter()).toFixed(3)),
      lagMinutes: parseFloat((48.3 + Math.random() * 5).toFixed(1)),
      rmse: parseFloat((0.42 + Math.random() * 0.07).toFixed(3)),
      dataAvailability: 94.2,
      orbitType: 'GEO'
    },
  ];
}

// POST /api/data/upload
router.post('/upload', upload.single('cdfFile'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded. Provide a CDF file as multipart/form-data field "cdfFile".' });
    return;
  }

  const steps = simulateCDFProcessing(file.originalname, file.size);
  const epochStart = new Date('2024-03-14T00:00:00Z');
  const epochEnd   = new Date('2024-03-15T00:00:00Z');
  const totalRecords = Math.floor(file.size / 64) + 1440;
  const missingEpochs = Math.floor(Math.random() * 8) + 2;

  const result: CDFUploadResult = {
    uploadId: uuidv4(),
    filename: file.originalname,
    fileSizeBytes: file.size,
    processingSteps: steps,
    detectedVariables: [
      'Epoch', 'B_GSM', 'B_GSE', 'V_GSE', 'N_p', 'T_p',
      'P_dyn', 'Bx_GSM', 'By_GSM', 'Bz_GSM', 'V_x', 'V_y', 'V_z',
      'ELECTRON_FLUX_2MEV', 'PROTON_FLUX_10MEV', 'Quality_Flag'
    ],
    epochStart: epochStart.toISOString(),
    epochEnd: epochEnd.toISOString(),
    totalRecords,
    missingEpochs,
    coordinateSystem: 'GSM (Geocentric Solar Magnetospheric)',
    status: missingEpochs < 5 ? 'SUCCESS' : 'PARTIAL'
  };

  res.json(result);
});

// GET /api/data/longitude-matrix
router.get('/longitude-matrix', (_req: Request, res: Response) => {
  res.json({
    matrix: buildLongitudeMatrix(),
    referenceBaseline: 'GOES-16 @ -75.2° GEO',
    generatedAt: new Date().toISOString(),
    method: 'Pearson cross-correlation with optimal lag search ±120 min'
  });
});

export default router;

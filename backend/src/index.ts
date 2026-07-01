// ============================================================
// HELIOS Backend - Express Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import telemetryRouter from './routes/telemetry.routes';
import dataRouter from './routes/data.routes';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'HELIOS Backend - Space Weather Forecast Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount routers
app.use('/api/telemetry', telemetryRouter);
app.use('/api/data', dataRouter);

// Serve frontend static build
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Client-side routing fallback – serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🛰️  HELIOS Backend running on http://localhost:${PORT}`);
  console.log(`📡  Telemetry stream: GET /api/telemetry/stream?step=N`);
  console.log(`📊  Full series:      GET /api/telemetry/full`);
  console.log(`📂  CDF Upload:       POST /api/data/upload`);
  console.log(`🌐  Longitude matrix: GET /api/data/longitude-matrix\n`);
});

export default app;

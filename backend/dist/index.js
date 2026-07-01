"use strict";
// ============================================================
// HELIOS Backend - Express Entry Point
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const telemetry_routes_1 = __importDefault(require("./routes/telemetry.routes"));
const data_routes_1 = __importDefault(require("./routes/data.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3001;
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/telemetry', telemetry_routes_1.default);
app.use('/api/data', data_routes_1.default);
// Serve frontend static build
const frontendDist = path_1.default.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express_1.default.static(frontendDist));
// Client-side routing fallback – serve index.html for any non-API route
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(frontendDist, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`\n🛰️  HELIOS Backend running on http://localhost:${PORT}`);
    console.log(`📡  Telemetry stream: GET /api/telemetry/stream?step=N`);
    console.log(`📊  Full series:      GET /api/telemetry/full`);
    console.log(`📂  CDF Upload:       POST /api/data/upload`);
    console.log(`🌐  Longitude matrix: GET /api/data/longitude-matrix\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map
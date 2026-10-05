"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_1 = __importDefault(require("./routes/api"));
const auth_1 = __importDefault(require("./routes/auth"));
const postgresDb_1 = require("./data/postgresDb");
const uploads_1 = require("./uploads");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static uploads
app.use('/uploads', express_1.default.static(uploads_1.uploadsDirectory));
// Mount API routes
app.use('/api/auth', auth_1.default);
app.use('/api', api_1.default);
// Health check
app.get('/api/health', async (_req, res) => {
    try {
        await postgresDb_1.PostgresDatabase.query('SELECT 1 AS connected');
        res.json({
            status: 'online',
            database: 'connected',
            system: 'School Equipment Management API',
            time: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('PostgreSQL health check failed:', error);
        res.status(503).json({
            status: 'unavailable',
            database: 'disconnected',
            system: 'School Equipment Management API',
            time: new Date().toISOString()
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 School Equipment Management API Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Uploads dir: http://localhost:${PORT}/uploads`);
    console.log(`===================================================`);
});

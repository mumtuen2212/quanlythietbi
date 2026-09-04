"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const api_1 = __importDefault(require("./routes/api"));
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
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Mount API routes
app.use('/api', api_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'School Equipment Management API',
        time: new Date().toISOString()
    });
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

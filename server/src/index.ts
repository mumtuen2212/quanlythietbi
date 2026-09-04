import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
app.use('/api', apiRouter);

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

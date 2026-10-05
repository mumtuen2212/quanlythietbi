import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import authRouter from './routes/auth';
import { PostgresDatabase } from './data/postgresDb';
import { uploadsDirectory } from './uploads';

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
app.use('/uploads', express.static(uploadsDirectory));

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await PostgresDatabase.query('SELECT 1 AS connected');
    res.json({
      status: 'online',
      database: 'connected',
      system: 'School Equipment Management API',
      time: new Date().toISOString()
    });
  } catch (error) {
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

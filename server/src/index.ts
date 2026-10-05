import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import apiRouter from './routes/api';
import authRouter from './routes/auth';

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
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Trả về thông báo rõ ràng cho biểu mẫu báo hỏng khi ảnh không hợp lệ/quá lớn.
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Mỗi ảnh tối đa 10 MB.'
      : error.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Bạn chỉ có thể gửi tối đa 5 ảnh.'
        : 'Không thể tải ảnh lên. Vui lòng thử lại.';
    return res.status(400).json({ success: false, message });
  }
  if (error) {
    return res.status(400).json({ success: false, message: error.message || 'Không thể tải ảnh lên.' });
  }
  next();
});

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

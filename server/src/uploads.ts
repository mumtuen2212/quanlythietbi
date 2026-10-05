import fs from 'fs';
import path from 'path';

export const uploadsDirectory = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, '../uploads')
);

fs.mkdirSync(uploadsDirectory, { recursive: true });

import sql from 'mssql';
import dotenv from 'dotenv';
import { consolidateSharedManuals } from './sharedManuals';

dotenv.config();

async function run() {
  const pool = await sql.connect({
    server: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 1434),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'quanlythietbi',
    options: { encrypt: false, trustServerCertificate: true }
  });
  try {
    console.log(JSON.stringify(await consolidateSharedManuals(pool)));
  } finally {
    await pool.close();
  }
}

run().catch(error => {
  console.error('Không thể gộp hướng dẫn:', error.message);
  process.exitCode = 1;
});

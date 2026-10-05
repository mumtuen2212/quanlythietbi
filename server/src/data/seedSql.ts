import bcrypt from 'bcryptjs';
import { PostgresDatabase } from './postgresDb';

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME || 'System administrator';
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!username || !password || !email) {
    throw new Error('Set SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD and SEED_ADMIN_EMAIL before running this command.');
  }
  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters.');
  }

  await PostgresDatabase.transaction(async client => {
    const role = await client.query('SELECT "VaiTroID" FROM "VaiTro" WHERE "MaVaiTro" = $1', ['ADMIN']);
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(`
      INSERT INTO "NguoiDung" (
        "TenDangNhap", "MatKhauHash", "HoTen", "Email", "VaiTroID", "TrangThai"
      ) VALUES ($1, $2, $3, $4, $5, 'HOAT_DONG')
      ON CONFLICT ("TenDangNhap") DO NOTHING
    `, [username, passwordHash, fullName, email, role.rows[0].VaiTroID]);
  });
  console.log('Admin user bootstrap completed. Existing users were not modified.');
}

seedAdmin().catch(error => {
  console.error('Không thể tạo tài khoản quản trị trên Neon:', error);
  process.exitCode = 1;
});

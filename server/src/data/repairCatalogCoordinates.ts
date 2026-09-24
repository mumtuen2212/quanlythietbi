/** Re-spaces existing TDMU room pins without deleting any database records. */
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();
const config: sql.config = {
  user: process.env.DB_USER || 'sa', password: process.env.DB_PASSWORD || '123456',
  server: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 1434), database: process.env.DB_NAME || 'quanlythietbi',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function run() {
  const pool = await sql.connect(config);
  try {
    const result = await pool.request().query<{ id: number; building_id: number; floor: number; latitude: number; longitude: number }>(`
      SELECT p.PhongHocID AS id, p.ToaNhaID AS building_id, p.Tang AS floor,
        CAST(t.Latitude AS float) AS latitude, CAST(t.Longitude AS float) AS longitude
      FROM dbo.PhongHoc p INNER JOIN dbo.ToaNha t ON t.ToaNhaID = p.ToaNhaID
      ORDER BY p.ToaNhaID, p.Tang, p.SoPhong
    `);
    const groups = new Map<string, Array<{ id: number; building_id: number; floor: number; latitude: number; longitude: number }>>();
    for (const room of result.recordset) {
      const key = `${room.building_id}-${room.floor}`;
      groups.set(key, [...(groups.get(key) || []), room]);
    }
    const transaction = new sql.Transaction(pool); await transaction.begin();
    try {
      for (const group of groups.values()) {
        const count = group.length;
        const columns = Math.min(5, count);
        const rows = Math.ceil(count / columns);
        for (let index = 0; index < count; index++) {
          const room = group[index];
          const column = index % columns;
          const row = Math.floor(index / columns);
          // Keep every pin within a compact building footprint: five columns
          // maximum, then a new row. The north offset moves floor-1 rooms from
          // the road edge to the visible building body on the OSM basemap.
          const latitude = room.latitude + 0.000120 + (room.floor - 1) * 0.000025 + (row - (rows - 1) / 2) * 0.000050;
          const longitude = room.longitude + (column - (columns - 1) / 2) * 0.000055;
          await new sql.Request(transaction).input('id', sql.Int, room.id).input('latitude', sql.Decimal(10, 7), latitude).input('longitude', sql.Decimal(10, 7), longitude).query('UPDATE dbo.PhongHoc SET Latitude=@latitude, Longitude=@longitude WHERE PhongHocID=@id');
        }
      }
      await transaction.commit();
      console.log(`Đã dàn lại tọa độ ${result.recordset.length} phòng.`);
    } catch (error) { await transaction.rollback().catch(() => undefined); throw error; }
  } finally { await pool.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

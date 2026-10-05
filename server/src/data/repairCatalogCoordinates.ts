import { PostgresDatabase } from './postgresDb';

async function repairCatalogCoordinates() {
  await PostgresDatabase.transaction(async client => {
    const result = await client.query<{
      id: number;
      building_id: number;
      floor: number;
      latitude: number;
      longitude: number;
    }>(`
      SELECT p."PhongHocID" AS id, p."ToaNhaID" AS building_id, p."Tang" AS floor,
        t."Latitude"::float8 AS latitude, t."Longitude"::float8 AS longitude
      FROM "PhongHoc" p
      INNER JOIN "ToaNha" t ON t."ToaNhaID" = p."ToaNhaID"
      ORDER BY p."ToaNhaID", p."Tang", p."SoPhong"
    `);
    const groups = new Map<string, typeof result.rows>();
    for (const room of result.rows) {
      const key = `${room.building_id}-${room.floor}`;
      groups.set(key, [...(groups.get(key) || []), room]);
    }

    for (const group of groups.values()) {
      const count = group.length;
      const columns = Math.min(5, count);
      const rows = Math.ceil(count / columns);
      for (let index = 0; index < count; index++) {
        const room = group[index];
        const column = index % columns;
        const row = Math.floor(index / columns);
        const latitude = room.latitude + 0.000120 + (room.floor - 1) * 0.000025 + (row - (rows - 1) / 2) * 0.000050;
        const longitude = room.longitude + (column - (columns - 1) / 2) * 0.000055;
        await client.query(
          'UPDATE "PhongHoc" SET "Latitude" = $1, "Longitude" = $2 WHERE "PhongHocID" = $3',
          [latitude, longitude, room.id]
        );
      }
    }
    console.log(`Đã dàn lại tọa độ ${result.rowCount} phòng trên Neon.`);
  });
}

repairCatalogCoordinates().catch(error => {
  console.error('Không thể sửa tọa độ phòng trên Neon:', error);
  process.exitCode = 1;
});

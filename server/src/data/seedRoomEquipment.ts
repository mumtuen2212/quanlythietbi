import { PostgresDatabase } from './postgresDb';

async function seedRoomEquipment() {
  await PostgresDatabase.transaction(async client => {
    await client.query(`
      INSERT INTO "LoaiThietBi" ("MaLoai", "TenLoai", "MoTa") VALUES
        ('LIGHT', 'Đèn chiếu sáng', 'Bóng đèn LED dùng cho phòng học'),
        ('TV', 'Tivi', 'Tivi hiển thị nội dung phục vụ giảng dạy'),
        ('SPEAKER', 'Loa', 'Loa phục vụ âm thanh phòng học')
      ON CONFLICT ("MaLoai") DO NOTHING
    `);

    await client.query(`
      WITH templates(category_code, code_prefix, device_name, model, location, description, quantity) AS (
        VALUES
          ('LIGHT', 'TDMU-BASE-LIGHT', 'Bóng đèn LED phòng học', 'LED Panel 36W', 'Trần phòng học', 'Đèn LED chiếu sáng phòng học', 6),
          ('TV', 'TDMU-BASE-TV', 'Tivi giảng dạy', 'Smart TV 55 inch', 'Phía trước lớp học', 'Tivi hiển thị bài giảng', 1),
          ('SPEAKER', 'TDMU-BASE-SPEAKER', 'Loa phòng học', 'Loa treo tường 30W', 'Hai bên bục giảng', 'Loa phục vụ âm thanh giảng dạy', 2),
          ('AC', 'TDMU-BASE-AC', 'Máy lạnh phòng học', 'Inverter 1.5 HP', 'Tường bên phòng học', 'Máy lạnh phục vụ phòng học', 2),
          ('MIC', 'TDMU-BASE-MIC', 'Bộ micro không dây', 'Micro UHF', 'Bàn giảng viên', 'Micro phục vụ giảng dạy', 1)
      ), generated AS (
        SELECT
          p."PhongHocID" AS room_id,
          c."LoaiThietBiID" AS category_id,
          t.code_prefix,
          t.device_name,
          t.model,
          t.location,
          t.description,
          n.number,
          t.code_prefix || '-' || p."PhongHocID" || '-' || lpad(n.number::text, 2, '0') AS device_code,
          p."SoPhong" AS room_number
        FROM "PhongHoc" p
        CROSS JOIN templates t
        JOIN "LoaiThietBi" c ON c."MaLoai" = t.category_code
        CROSS JOIN LATERAL generate_series(1, t.quantity) AS n(number)
      )
      INSERT INTO "ThietBi" (
        "PhongHocID", "LoaiThietBiID", "MaThietBi", "TenThietBi", "Model", "SerialNumber",
        "ViTri", "TrangThai", "MaQR", "MoTa"
      )
      SELECT room_id, category_id, device_code,
        device_name || ' ' || room_number ||
          CASE WHEN number > 1 OR code_prefix IN ('TDMU-BASE-LIGHT', 'TDMU-BASE-SPEAKER', 'TDMU-BASE-AC')
            THEN ' - ' || number::text ELSE '' END,
        model, 'SN-' || replace(device_code, 'TDMU-BASE-', ''), location, 'ACTIVE',
        'QR-EQ-' || device_code, description
      FROM generated
      ON CONFLICT ("MaThietBi") DO NOTHING
    `);

    await client.query(`
      UPDATE "ThietBi" d
      SET "TenThietBi" =
        CASE c."MaLoai"
          WHEN 'LIGHT' THEN 'Bóng đèn LED phòng học'
          WHEN 'TV' THEN 'Tivi giảng dạy'
          WHEN 'SPEAKER' THEN 'Loa phòng học'
          WHEN 'AC' THEN 'Máy lạnh phòng học'
          ELSE 'Bộ micro không dây'
        END || ' ' || p."SoPhong" ||
        CASE WHEN c."MaLoai" IN ('LIGHT', 'SPEAKER', 'AC')
          THEN ' - ' || right(d."MaThietBi", 2) ELSE '' END
      FROM "PhongHoc" p, "LoaiThietBi" c
      WHERE d."PhongHocID" = p."PhongHocID"
        AND d."LoaiThietBiID" = c."LoaiThietBiID"
        AND d."MaThietBi" LIKE 'TDMU-BASE-%'
    `);

    await client.query(`
      UPDATE "HuongDanSuDung" h
      SET "TieuDe" = 'Hướng dẫn sử dụng ' || d."TenThietBi"
      FROM "ThietBi" d
      WHERE h."ThietBiID" = d."ThietBiID"
        AND d."MaThietBi" LIKE 'TDMU-BASE-%'
    `);

    await client.query(`
      INSERT INTO "HuongDanSuDung" ("ThietBiID", "TieuDe", "NoiDung")
      SELECT d."ThietBiID", 'Hướng dẫn sử dụng ' || d."TenThietBi",
        CASE c."MaLoai"
          WHEN 'LIGHT' THEN E'# HƯỚNG DẪN ĐÈN\\n\\n1. Bật công tắc đèn tại cửa phòng.\\n2. Kiểm tra ánh sáng trước giờ học.\\n3. Nếu đèn không sáng hoặc chập chờn, chọn **Báo hỏng thiết bị**.'
          WHEN 'TV' THEN E'# HƯỚNG DẪN TIVI\\n\\n1. Bấm nút nguồn trên remote.\\n2. Chọn đúng cổng HDMI.\\n3. Nếu không lên hình hoặc không có tiếng, chọn **Báo hỏng thiết bị**.'
          WHEN 'SPEAKER' THEN E'# HƯỚNG DẪN LOA\\n\\n1. Bật hệ thống âm thanh tại bục giảng.\\n2. Điều chỉnh âm lượng vừa đủ.\\n3. Nếu loa rè, mất tiếng hoặc hú kéo dài, chọn **Báo hỏng thiết bị**.'
          WHEN 'AC' THEN E'# HƯỚNG DẪN MÁY LẠNH\\n\\n1. Bật bằng remote.\\n2. Chọn nhiệt độ phù hợp từ 24 đến 26°C.\\n3. Nếu máy không mát hoặc chảy nước, chọn **Báo hỏng thiết bị**.'
          ELSE E'# HƯỚNG DẪN MICRO\\n\\n1. Bật đầu thu và micro.\\n2. Kiểm tra pin và mức âm lượng.\\n3. Nếu micro không lên nguồn hoặc mất tiếng, chọn **Báo hỏng thiết bị**.'
        END
      FROM "ThietBi" d
      JOIN "LoaiThietBi" c ON c."LoaiThietBiID" = d."LoaiThietBiID"
      WHERE d."MaThietBi" LIKE 'TDMU-BASE-%'
        AND NOT EXISTS (
          SELECT 1 FROM "HuongDanSuDung" h WHERE h."ThietBiID" = d."ThietBiID"
        )
    `);
  });

  const summary = await PostgresDatabase.query<{ rooms: string; devices: string }>(`
    SELECT COUNT(DISTINCT "PhongHocID") AS rooms, COUNT(*) AS devices
    FROM "ThietBi" WHERE "MaThietBi" LIKE 'TDMU-BASE-%'
  `);
  console.log(`Đã đồng bộ thiết bị mẫu trên ${summary[0]?.rooms || 0} phòng (${summary[0]?.devices || 0} thiết bị).`);
}

seedRoomEquipment().catch(error => {
  console.error('Không thể tạo dữ liệu thiết bị mẫu trên Neon:', error);
  process.exitCode = 1;
});

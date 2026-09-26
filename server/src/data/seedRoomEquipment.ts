/**
 * Tạo dữ liệu thiết bị cơ bản để kiểm thử QR theo từng phòng.
 * An toàn khi chạy lại: chỉ thêm những mã thiết bị TDMU-BASE chưa tồn tại.
 */
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  server: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 1434),
  database: process.env.DB_NAME || 'quanlythietbi',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function run() {
  const pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);

    // Tạo các nhóm thiết bị còn thiếu, không thay đổi nhóm đã có.
    await request.query(`
      MERGE dbo.LoaiThietBi AS target
      USING (VALUES
        (N'LIGHT', N'Đèn chiếu sáng', N'Bóng đèn LED dùng cho phòng học'),
        (N'TV', N'Tivi', N'Tivi hiển thị nội dung phục vụ giảng dạy'),
        (N'SPEAKER', N'Loa', N'Loa phục vụ âm thanh phòng học')
      ) AS source (MaLoai, TenLoai, MoTa)
      ON target.MaLoai = source.MaLoai
      WHEN NOT MATCHED THEN
        INSERT (MaLoai, TenLoai, MoTa) VALUES (source.MaLoai, source.TenLoai, source.MoTa);
    `);

    // 6 đèn + 1 tivi + 2 loa + 2 máy lạnh + 1 micro = 12 thiết bị/phòng.
    const insertResult = await request.query(`
      DECLARE @EquipmentTemplates TABLE (
        CategoryCode nvarchar(30), CodePrefix nvarchar(30), DeviceName nvarchar(200),
        Model nvarchar(120), LocationText nvarchar(200), DescriptionText nvarchar(500), Quantity int
      );

      INSERT INTO @EquipmentTemplates VALUES
        (N'LIGHT',   N'TDMU-BASE-LIGHT',   N'Bóng đèn LED phòng học',       N'LED Panel 36W',          N'Trần phòng học',            N'Đèn LED chiếu sáng phòng học', 6),
        (N'TV',      N'TDMU-BASE-TV',      N'Tivi giảng dạy',              N'Smart TV 55 inch',         N'Phía trước lớp học',         N'Tivi hiển thị bài giảng', 1),
        (N'SPEAKER', N'TDMU-BASE-SPEAKER', N'Loa phòng học',                N'Loa treo tường 30W',       N'Hai bên bục giảng',         N'Loa phục vụ âm thanh giảng dạy', 2),
        (N'AC',      N'TDMU-BASE-AC',      N'Máy lạnh phòng học',          N'Inverter 1.5 HP',          N'Tường bên phòng học',       N'Máy lạnh phục vụ phòng học', 2),
        (N'MIC',     N'TDMU-BASE-MIC',     N'Bộ micro không dây',          N'Micro UHF',                N'Bàn giảng viên',            N'Micro phục vụ giảng dạy', 1);

      ;WITH Numbers AS (
        SELECT 1 AS NumberValue UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
      ), EquipmentToInsert AS (
        SELECT
          p.PhongHocID,
          c.LoaiThietBiID,
          t.CodePrefix,
          t.DeviceName,
          t.Model,
          t.LocationText,
          t.DescriptionText,
          n.NumberValue,
          CONCAT(t.CodePrefix, N'-', p.PhongHocID, N'-', RIGHT(N'00' + CONVERT(nvarchar(2), n.NumberValue), 2)) AS DeviceCode
        FROM dbo.PhongHoc p
        CROSS JOIN @EquipmentTemplates t
        INNER JOIN dbo.LoaiThietBi c ON c.MaLoai = t.CategoryCode
        INNER JOIN Numbers n ON n.NumberValue <= t.Quantity
      )
      INSERT INTO dbo.ThietBi (
        PhongHocID, LoaiThietBiID, MaThietBi, TenThietBi, Model, SerialNumber,
        ViTri, TrangThai, MaQR, MoTa, NgayTao
      )
      SELECT
        source.PhongHocID, source.LoaiThietBiID, source.DeviceCode,
        CONCAT(
          source.DeviceName, N' ',
          (SELECT SoPhong FROM dbo.PhongHoc WHERE PhongHocID = source.PhongHocID),
          CASE WHEN source.NumberValue > 1 OR source.CodePrefix IN (N'TDMU-BASE-LIGHT', N'TDMU-BASE-SPEAKER', N'TDMU-BASE-AC')
            THEN CONCAT(N' - ', source.NumberValue) ELSE N'' END
        ), source.Model,
        CONCAT(N'SN-', REPLACE(source.DeviceCode, N'TDMU-BASE-', N'')),
        source.LocationText, N'ACTIVE', CONCAT(N'QR-EQ-', source.DeviceCode), source.DescriptionText, GETDATE()
      FROM EquipmentToInsert source
      WHERE NOT EXISTS (
        SELECT 1 FROM dbo.ThietBi existingDevice WHERE existingDevice.MaThietBi = source.DeviceCode
      );

      SELECT @@ROWCOUNT AS insertedDevices;
    `);

    // Đồng bộ lại tên các thiết bị mẫu đã tạo từ lần chạy trước theo đúng mã phòng.
    // Ví dụ: "Bóng đèn LED phòng học A1-101 - 1".
    await request.query(`
      UPDATE d
      SET TenThietBi = CONCAT(
        CASE c.MaLoai
          WHEN N'LIGHT' THEN N'Bóng đèn LED phòng học'
          WHEN N'TV' THEN N'Tivi giảng dạy'
          WHEN N'SPEAKER' THEN N'Loa phòng học'
          WHEN N'AC' THEN N'Máy lạnh phòng học'
          ELSE N'Bộ micro không dây'
        END,
        N' ', p.SoPhong,
        CASE WHEN c.MaLoai IN (N'LIGHT', N'SPEAKER', N'AC')
          THEN CONCAT(N' - ', RIGHT(d.MaThietBi, 2)) ELSE N'' END
      )
      FROM dbo.ThietBi d
      INNER JOIN dbo.PhongHoc p ON p.PhongHocID = d.PhongHocID
      INNER JOIN dbo.LoaiThietBi c ON c.LoaiThietBiID = d.LoaiThietBiID
      WHERE d.MaThietBi LIKE N'TDMU-BASE-%';

      UPDATE h
      SET TieuDe = CONCAT(N'Hướng dẫn sử dụng ', d.TenThietBi)
      FROM dbo.HuongDanSuDung h
      INNER JOIN dbo.ThietBi d ON d.ThietBiID = h.ThietBiID
      WHERE d.MaThietBi LIKE N'TDMU-BASE-%';
    `);

    // Mỗi thiết bị mẫu đều có sẵn một hướng dẫn cơ bản để kiểm thử luồng "Xem hướng dẫn".
    const manualResult = await request.query(`
      INSERT INTO dbo.HuongDanSuDung (ThietBiID, TieuDe, NoiDung, NgayTao)
      SELECT
        d.ThietBiID,
        CONCAT(N'Hướng dẫn sử dụng ', d.TenThietBi),
        CASE c.MaLoai
          WHEN N'LIGHT' THEN N'# HƯỚNG DẪN ĐÈN\n\n1. Bật công tắc đèn tại cửa phòng.\n2. Kiểm tra ánh sáng trước giờ học.\n3. Nếu đèn không sáng hoặc chập chờn, chọn **Báo hỏng thiết bị**.'
          WHEN N'TV' THEN N'# HƯỚNG DẪN TIVI\n\n1. Bấm nút nguồn trên remote.\n2. Chọn đúng cổng HDMI.\n3. Nếu không lên hình hoặc không có tiếng, chọn **Báo hỏng thiết bị**.'
          WHEN N'SPEAKER' THEN N'# HƯỚNG DẪN LOA\n\n1. Bật hệ thống âm thanh tại bục giảng.\n2. Điều chỉnh âm lượng vừa đủ.\n3. Nếu loa rè, mất tiếng hoặc hú kéo dài, chọn **Báo hỏng thiết bị**.'
          WHEN N'AC' THEN N'# HƯỚNG DẪN MÁY LẠNH\n\n1. Bật bằng remote.\n2. Chọn nhiệt độ phù hợp từ 24 đến 26°C.\n3. Nếu máy không mát hoặc chảy nước, chọn **Báo hỏng thiết bị**.'
          ELSE N'# HƯỚNG DẪN MICRO\n\n1. Bật đầu thu và micro.\n2. Kiểm tra pin và mức âm lượng.\n3. Nếu micro không lên nguồn hoặc mất tiếng, chọn **Báo hỏng thiết bị**.'
        END,
        GETDATE()
      FROM dbo.ThietBi d
      INNER JOIN dbo.LoaiThietBi c ON c.LoaiThietBiID = d.LoaiThietBiID
      WHERE d.MaThietBi LIKE N'TDMU-BASE-%'
        AND NOT EXISTS (SELECT 1 FROM dbo.HuongDanSuDung h WHERE h.ThietBiID = d.ThietBiID);

      SELECT @@ROWCOUNT AS insertedManuals;
    `);

    const summary = await new sql.Request(transaction).query(`
      SELECT
        COUNT(*) AS roomCount,
        SUM(CASE WHEN deviceCount = 12 THEN 1 ELSE 0 END) AS roomsWithExactlyTwelveBaselineDevices,
        SUM(deviceCount) AS totalBaselineDevices
      FROM (
        SELECT p.PhongHocID, COUNT(d.ThietBiID) AS deviceCount
        FROM dbo.PhongHoc p
        LEFT JOIN dbo.ThietBi d ON d.PhongHocID = p.PhongHocID AND d.MaThietBi LIKE N'TDMU-BASE-%'
        GROUP BY p.PhongHocID
      ) counts;
    `);

    const demoRoom = await new sql.Request(transaction).query(`
      SELECT TOP 1 SoPhong AS roomNumber, MaQR AS roomQrCode
      FROM dbo.PhongHoc
      WHERE SoPhong = N'A1-101';
    `);

    await transaction.commit();
    const insertedDevices = insertResult.recordset?.[0]?.insertedDevices ?? 0;
    const insertedManuals = manualResult.recordset?.[0]?.insertedManuals ?? 0;
    const totals = summary.recordset?.[0];
    const demoRoomRow = demoRoom.recordset?.[0];

    console.log(`Đã thêm ${insertedDevices} thiết bị và ${insertedManuals} hướng dẫn.`);
    console.log(`${totals?.roomCount ?? 0} phòng có dữ liệu; ${totals?.roomsWithExactlyTwelveBaselineDevices ?? 0} phòng đủ 12 thiết bị cơ bản.`);
    console.log(`QR phòng thử: ${demoRoomRow?.roomQrCode ?? 'Không tìm thấy phòng A1-101'}`);
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  } finally {
    await pool.close();
  }
}

run().catch(error => {
  console.error('Không thể tạo dữ liệu thiết bị mẫu:', error);
  process.exitCode = 1;
});

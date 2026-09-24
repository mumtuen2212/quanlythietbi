import sql from 'mssql';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123456',
  server: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '1434', 10),
  database: process.env.DB_NAME || 'quanlythietbi',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function seed() {
  console.log('Connecting to SQL Server...');
  const pool = await sql.connect(config);
  console.log('Connected successfully!');

  // 1. Clear existing data in correct FK order
  console.log('Cleaning old data...');
  await pool.request().query(`
    DELETE FROM dbo.LogBaoTri;
    DELETE FROM dbo.BaoHong;
    DELETE FROM dbo.HuongDanSuDung;
    DELETE FROM dbo.ThietBi;
    DELETE FROM dbo.PhongHoc;
    DELETE FROM dbo.ToaNha;
    DELETE FROM dbo.LoaiThietBi;
    DELETE FROM dbo.DiemNoiBat;
    DELETE FROM dbo.PhanQuyenNguoiDung;
    DELETE FROM dbo.PhanQuyenVaiTro;
    DELETE FROM dbo.NguoiDung;
    DELETE FROM dbo.Quyen;
    DELETE FROM dbo.VaiTro;
  `);

  // Reset identities
  const tables = [
    'LogBaoTri', 'BaoHong', 'HuongDanSuDung', 'ThietBi',
    'PhongHoc', 'ToaNha', 'LoaiThietBi', 'DiemNoiBat',
    'NguoiDung', 'Quyen', 'VaiTro'
  ];
  for (const t of tables) {
    try {
      await pool.request().query(`DBCC CHECKIDENT ('dbo.${t}', RESEED, 0)`);
    } catch (e) {}
  }

  // 2. Seed VaiTro
  console.log('Seeding VaiTro...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.VaiTro ON;
    INSERT INTO dbo.VaiTro (VaiTroID, MaVaiTro, TenVaiTro, CapDo, MoTa) VALUES
    (1, N'ADMIN', N'Quản trị hệ thống', 1, N'Admin cao nhất, toàn quyền cấu hình và quản trị'),
    (2, N'PENDING', N'Chờ cấp quyền', 5, N'Tài khoản mới đăng ký đang chờ phê duyệt'),
    (3, N'TECHNICIAN', N'Kỹ thuật viên', 2, N'Quản lý thiết bị, xử lý và cập nhật báo hỏng'),
    (4, N'TEACHER', N'Giảng viên', 3, N'Tra cứu phòng học, thiết bị và gửi phiếu báo hỏng'),
    (5, N'STUDENT', N'Sinh viên', 4, N'Tra cứu cẩm nang, xem bản đồ và báo hỏng');
    SET IDENTITY_INSERT dbo.VaiTro OFF;
  `);

  // 3. Seed Quyen
  console.log('Seeding Quyen...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.Quyen ON;
    INSERT INTO dbo.Quyen (QuyenID, MaQuyen, TenQuyen, MoTa) VALUES
    (1, N'VIEW_DASHBOARD', N'Xem Dashboard', N'Xem tổng quan thống kê phòng, thiết bị, báo hỏng'),
    (2, N'VIEW_ROOMS', N'Xem Phòng Học', N'Xem danh sách và sơ đồ chi tiết phòng học'),
    (3, N'VIEW_DEVICES', N'Xem Thiết Bị', N'Xem chi tiết thông tin và lịch sử thiết bị'),
    (4, N'VIEW_MAP', N'Xem Bản Đồ', N'Xem bản đồ khuôn viên trường Leaflet/Interactive'),
    (5, N'REPORT_INCIDENT', N'Báo Hỏng Thiết Bị', N'Tạo phiếu báo sự cố hỏng hóc 1-chạm kèm ảnh'),
    (6, N'MANAGE_DEVICES', N'Quản Lý Thiết Bị', N'Thêm, sửa, xóa thông tin và xuất mã QR thiết bị'),
    (7, N'MANAGE_ROOMS', N'Quản Lý Phòng', N'Thêm, sửa, bố trí sơ đồ phòng học'),
    (8, N'MANAGE_USERS', N'Quản Lý Người Dùng', N'Xem danh sách tài khoản và đổi vai trò'),
    (9, N'GRANT_PERMISSIONS', N'Cấp Quyền Hệ Thống', N'Phân quyền chi tiết cho từng tài khoản'),
    (10, N'RESOLVE_INCIDENTS', N'Xử Lý Sự Cố', N'Tiếp nhận phiếu báo hỏng, cập nhật tiến độ, ghi log'),
    (11, N'VIEW_MANUALS', N'Xem Hướng Dẫn', N'Tra cứu tài liệu hướng dẫn Micro Sisu, Máy chiếu');
    SET IDENTITY_INSERT dbo.Quyen OFF;
  `);

  // 4. Seed PhanQuyenVaiTro
  console.log('Seeding PhanQuyenVaiTro...');
  await pool.request().query(`
    INSERT INTO dbo.PhanQuyenVaiTro (VaiTroID, QuyenID) VALUES
    (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),
    (3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,10),(3,11),
    (4,1),(4,2),(4,3),(4,4),(4,5),(4,11),
    (5,2),(5,3),(5,4),(5,5),(5,11);
  `);

  // 5. Seed NguoiDung
  console.log('Seeding NguoiDung...');
  const pwAdmin = await bcrypt.hash('admin123', 10);
  const pwTech = await bcrypt.hash('tech123', 10);
  const pwTeacher = await bcrypt.hash('teacher123', 10);
  const pwStudent = await bcrypt.hash('student123', 10);

  const reqUser = pool.request();
  reqUser.input('pwAdmin', pwAdmin);
  reqUser.input('pwTech', pwTech);
  reqUser.input('pwTeacher', pwTeacher);
  reqUser.input('pwStudent', pwStudent);

  await reqUser.query(`
    SET IDENTITY_INSERT dbo.NguoiDung ON;
    INSERT INTO dbo.NguoiDung (NguoiDungID, TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, VaiTroID, TrangThai, NgayTao, NgayCapNhat) VALUES
    (1, N'admin', @pwAdmin, N'Quản trị viên Hệ thống (Admin)', N'admin@school.edu.vn', N'0909.000.001', 1, N'HOAT_DONG', GETDATE(), GETDATE()),
    (2, N'technician', @pwTech, N'KTV. Trần Minh Quang', N'quang.tm@school.edu.vn', N'0909.000.002', 3, N'HOAT_DONG', GETDATE(), GETDATE()),
    (3, N'teacher', @pwTeacher, N'ThS. Nguyễn Văn Hùng', N'hung.nv@school.edu.vn', N'0912.345.678', 4, N'HOAT_DONG', GETDATE(), GETDATE()),
    (4, N'student', @pwStudent, N'Sinh viên Nguyễn Văn An', N'an.nv@student.school.edu.vn', N'0987.654.321', 5, N'HOAT_DONG', GETDATE(), GETDATE());
    SET IDENTITY_INSERT dbo.NguoiDung OFF;
  `);

  // 6. Seed DiemNoiBat (Campus POIs)
  console.log('Seeding DiemNoiBat...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.DiemNoiBat ON;
    INSERT INTO dbo.DiemNoiBat (DiemNoiBatID, MaDiem, TenDiem, LoaiDiem, MoTa, X, Y, NgayTao) VALUES
    (1, N'POI-GATE-1', N'Cổng 1 - Cổng Chính (Đường Lê Hồng Phong)', N'GATE', N'Lối vào chính dành cho Giảng viên, Sinh viên và Khách tham quan', 420, 70, GETDATE()),
    (2, N'POI-GATE-2', N'Cổng 2 - Cổng Phụ (Khu Ký Túc Xá & Gửi xe)', N'GATE', N'Lối vào bãi giữ xe máy sinh viên và nhà ăn', 820, 260, GETDATE()),
    (3, N'POI-PARKING-1', N'Nhà Xe Sinh Viên Khu A-B', N'PARKING', N'Bãi gửi xe 2 tầng có mái che', 800, 150, GETDATE()),
    (4, N'POI-CANTEEN', N'Căng Tin & Khu Dịch Vụ Sinh Viên', N'CANTEEN', N'Khu ăn uống, cà phê và văn phòng phẩm', 750, 390, GETDATE()),
    (5, N'POI-LIBRARY', N'Trung Tâm Thư Viện & Học Liệu Số', N'LIBRARY', N'Thư viện 3 tầng với hơn 50.000 đầu sách', 120, 220, GETDATE()),
    (6, N'POI-SPORTS', N'Khu Thể Thao & Sân Bóng Rổ', N'SPORTS', N'Sân tập thể dục và bóng rổ ngoài trời', 120, 400, GETDATE()),
    (7, N'POI-ADMIN', N'Tòa Nhà Điều Hành & Ban Giám Hiệu', N'ADMIN', N'Phòng tiếp công dân, Phòng Đào tạo & CSVC', 420, 180, GETDATE());
    SET IDENTITY_INSERT dbo.DiemNoiBat OFF;
  `);

  // 7. Seed ToaNha
  console.log('Seeding ToaNha...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.ToaNha ON;
    INSERT INTO dbo.ToaNha (ToaNhaID, MaToaNha, TenToaNha, MoTa, X, Y, ChieuRong, ChieuCao, SoTang, MauSac, XiengVaoX, XiengVaoY, NgayTao) VALUES
    (1, N'A', N'Tòa Nhà A - Giảng Đường Lý Thuyết', N'Khu giảng đường chính 5 tầng gồm 40 phòng học lý thuyết được trang bị máy chiếu, micro Sisu xanh, điều hòa', 230, 280, 200, 140, 5, N'#0284c7', 330, 280, GETDATE()),
    (2, N'B', N'Tòa Nhà B - Thực Hành & Lab CNTT', N'Tòa nhà công nghệ cao 4 tầng trang bị phòng máy chuyên dụng, thiết bị âm thanh hội thảo và màn hình tương tác', 480, 280, 220, 150, 4, N'#059669', 590, 280, GETDATE()),
    (3, N'C', N'Tòa Nhà C - Hội Trường & Đa Năng', N'Hội trường lớn 800 chỗ và cụm các phòng hội thảo quốc tế trang bị hệ thống âm thanh ánh sáng chuyên nghiệp', 350, 460, 250, 130, 3, N'#d97706', 475, 460, GETDATE());
    SET IDENTITY_INSERT dbo.ToaNha OFF;
  `);

  // 8. Seed LoaiThietBi
  console.log('Seeding LoaiThietBi...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.LoaiThietBi ON;
    INSERT INTO dbo.LoaiThietBi (LoaiThietBiID, MaLoai, TenLoai, MoTa) VALUES
    (1, N'MIC', N'Micro & Thiết Bị Thu Âm', N'Bộ micro không dây cầm tay/cài áo phục vụ giảng dạy, nổi bật Micro Sisu màu xanh'),
    (2, N'PROJECTOR', N'Máy Chiếu & Màn Chiếu', N'Máy chiếu laser/LCD gắn trần, màn chiếu điện tử cuốn'),
    (3, N'AMPLIFIER', N'Âm Ly & Hệ Thống Loa', N'Bộ khuếch đại âm thanh giảng đường, mixer và loa treo tường'),
    (4, N'AC', N'Điều Hòa & Thông Gió', N'Điều hòa không khí 2 chiều inverter và quạt thông gió trần'),
    (5, N'INTERACTIVE', N'Màn Hình Tương Tác', N'Màn hình cảm ứng 86 inch tích hợp bảng viết điện tử');
    SET IDENTITY_INSERT dbo.LoaiThietBi OFF;
  `);

  // 9. Seed PhongHoc
  console.log('Seeding PhongHoc...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.PhongHoc ON;
    INSERT INTO dbo.PhongHoc (PhongHocID, ToaNhaID, SoPhong, TenPhong, Tang, MaQR, TrangThai, MoTa, LoaiPhong, X, Y, ChieuRong, ChieuCao, CuaX, CuaY, NgayTao) VALUES
    (1, 1, N'A.301', N'Phòng học lý thuyết A.301', 3, N'QR-ROOM-A301', N'ACTIVE', N'Phòng học chất lượng cao 80 chỗ, trang bị máy chiếu, micro Sisu xanh, điều hòa', N'CLASSROOM', 20, 20, 180, 130, 20, 70, GETDATE()),
    (2, 1, N'A.302', N'Phòng học lý thuyết A.302', 3, N'QR-ROOM-A302', N'ACTIVE', N'Phòng học lý thuyết 80 chỗ, trang bị micro không dây và hệ thống âm thanh treo tường', N'CLASSROOM', 220, 20, 180, 130, 220, 70, GETDATE()),
    (3, 1, N'A.303', N'Phòng học lý thuyết A.303', 3, N'QR-ROOM-A303', N'ACTIVE', N'Phòng học đa năng 100 chỗ ngồi bậc thang', N'CLASSROOM', 420, 20, 190, 130, 420, 70, GETDATE()),
    (4, 1, N'A.304', N'Phòng học A.304', 3, N'QR-ROOM-A304', N'MAINTENANCE', N'Đang bảo trì định kỳ hệ thống âm thanh và máy chiếu', N'CLASSROOM', 630, 20, 180, 130, 630, 70, GETDATE()),
    (5, 1, N'A.401', N'Phòng học lý thuyết A.401', 4, N'QR-ROOM-A401', N'ACTIVE', N'Phòng học tầng 4 khu A trang bị micro Sisu xanh và máy chiếu laser', N'CLASSROOM', 20, 20, 180, 130, 20, 70, GETDATE()),
    (6, 1, N'A.402', N'Phòng học lý thuyết A.402', 4, N'QR-ROOM-A402', N'ACTIVE', N'Phòng học tầng 4 khu A', N'CLASSROOM', 220, 20, 180, 130, 220, 70, GETDATE()),
    (7, 2, N'B.101', N'Phòng Lab CNTT 1 (B.101)', 1, N'QR-ROOM-B101', N'ACTIVE', N'Phòng thực hành máy tính 50 máy Dell, micro trợ giảng và màn hình tương tác', N'LAB', 20, 20, 220, 140, 20, 80, GETDATE()),
    (8, 2, N'B.102', N'Phòng Lab Đồ Họa 2 (B.102)', 1, N'QR-ROOM-B102', N'ACTIVE', N'Phòng Lab đồ họa và AI cấu hình cao', N'LAB', 260, 20, 220, 140, 260, 80, GETDATE()),
    (9, 3, N'C.101', N'Hội Trường Lớn C.101 (800 Chỗ)', 1, N'QR-ROOM-C101', N'ACTIVE', N'Hội trường chính của trường, trang bị hệ thống âm thanh line array và cụm micro Sisu UHF đa kênh', N'HALL', 20, 20, 360, 150, 180, 20, GETDATE()),
    (10, 3, N'C.201', N'Phòng Hội Thảo Quốc Tế C.201', 2, N'QR-ROOM-C201', N'ACTIVE', N'Phòng hội thảo 120 chỗ với thiết bị hội nghị trực tuyến Polycom', N'HALL', 20, 20, 280, 140, 20, 70, GETDATE());
    SET IDENTITY_INSERT dbo.PhongHoc OFF;
  `);

  // 10. Seed ThietBi
  console.log('Seeding ThietBi...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.ThietBi ON;
    INSERT INTO dbo.ThietBi (ThietBiID, PhongHocID, LoaiThietBiID, MaThietBi, TenThietBi, Model, SerialNumber, ViTri, TrangThai, MaQR, MoTa, NgayTao) VALUES
    (1, 1, 1, N'MIC-A301-001', N'Bộ Micro Không Dây Sisu Màu Xanh (A.301)', N'Sisu SoundLink UHF Pro Blue', N'SISU-2024-BL01', N'Bàn giáo viên - Hộp thiết bị A.301', N'ACTIVE', N'QR-EQ-MIC-A301-001', N'Bộ micro không dây cầm tay màu xanh đặc trưng, kèm đầu thu 2 râu UHF hiển thị tần số màn hình LCD xanh dương', GETDATE()),
    (2, 1, 2, N'PJ-A301-001', N'Máy Chiếu Panasonic Laser PT-VMZ51', N'Panasonic PT-VMZ51', N'PANA-VMZ-88219', N'Treo trần chính giữa phòng A.301', N'ACTIVE', N'QR-EQ-PJ-A301-001', N'Máy chiếu laser độ sáng 5200 ANSI Lumens, độ phân giải WUXGA', GETDATE()),
    (3, 1, 3, N'AMP-A301-001', N'Âm Ly Giảng Đường Boston PA-200', N'Boston Acoustics PA-200', N'BST-PA-9931', N'Tủ kỹ thuật âm thanh góc bục giảng', N'ACTIVE', N'QR-EQ-AMP-A301-001', N'Khuếch đại công suất 200W kèm mixer 4 kênh', GETDATE()),
    (4, 2, 1, N'MIC-A302-001', N'Bộ Micro Không Dây Sisu Màu Xanh (A.302)', N'Sisu SoundLink UHF Pro Blue', N'SISU-2024-BL02', N'Bàn giáo viên A.302', N'ACTIVE', N'QR-EQ-MIC-A302-001', N'Bộ micro Sisu xanh có tính năng đồng bộ tần số mắt đọc hồng ngoại IR', GETDATE()),
    (5, 4, 1, N'MIC-A304-001', N'Bộ Micro Không Dây Sisu Màu Xanh (A.304)', N'Sisu SoundLink UHF Pro Blue', N'SISU-2024-BL04', N'Bàn giáo viên A.304', N'DAMAGED', N'QR-EQ-MIC-A304-001', N'Micro bị mất tiếng, đầu thu báo lệch kênh tần số với tay cầm', GETDATE()),
    (6, 7, 5, N'INT-B101-001', N'Màn Hình Tương Tác ViewSonic 86 inch', N'ViewSonic IFP8650-3', N'VS-IFP-860012', N'Bục giảng phòng Lab B.101', N'ACTIVE', N'QR-EQ-INT-B101-001', N'Màn hình cảm ứng đa điểm 4K Ultra HD', GETDATE()),
    (7, 9, 1, N'MIC-C101-001', N'Cụm 04 Micro Không Dây Sisu Sân Khấu (C.101)', N'Sisu Multi-Channel Conference Blue', N'SISU-CONF-04BL', N'Bàn điều khiển âm thanh hội trường C.101', N'ACTIVE', N'QR-EQ-MIC-C101-001', N'Hệ thống 4 tay micro không dây màu xanh cao cấp phục vụ đại hội và văn nghệ', GETDATE());
    SET IDENTITY_INSERT dbo.ThietBi OFF;
  `);

  // 11. Seed HuongDanSuDung
  console.log('Seeding HuongDanSuDung...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.HuongDanSuDung ON;
    INSERT INTO dbo.HuongDanSuDung (HuongDanID, ThietBiID, TieuDe, NoiDung, NgayTao) VALUES
    (1, 1, N'Hướng Dẫn Toàn Tập Sử Dụng & Khắc Phục Lỗi Bộ Micro Sisu Màu Xanh', N'# CẨM NANG SỬ DỤNG BỘ MICRO KHÔNG DÂY SISU MÀU XANH

## 1. Nhận diện thiết bị
- **Tay micro:** Thân vỏ hợp kim nhôm sơn tĩnh điện **màu xanh dương đặc trưng (Cyan Blue)**, đuôi mic có nắp vặn pin và nút nguồn cảm biến.
- **Đầu thu (Receiver):** Mặt trước màu đen kết hợp viền xanh, trang bị 2 màn hình LCD hiển thị tần số sóng UHF (kênh CH-A và CH-B) và mắt phát hồng ngoại (IR SYNC).

---

## 2. Các bước bật nguồn & sử dụng nhanh
1. **Kiểm tra pin:** Vặn ngược chiều kim đồng hồ nắp đuôi mic màu xanh. Lắp 02 viên pin tiểu AA (khuyên dùng pin kiềm Alkaline hoặc pin sạc Eneloop). Chú ý đúng cực (+) và (-).
2. **Bật đầu thu:** Nhấn nút POWER trên đầu thu đặt tại tủ âm thanh bục giảng. Màn hình LCD phát sáng màu xanh dương hiển thị tần số (Ví dụ: 650.250 MHz).
3. **Bật tay micro:** Nhấn và giữ nút nguồn trên thân mic 2 giây. Màn hình led nhỏ trên thân mic sáng đèn và báo dung lượng pin.
4. **Kiểm tra kết nối sóng:** Nhìn vào đầu thu, cột sóng RF và AF nhảy vạch khi nói thử vào mic là đã kết nối thành công.

---

## 3. Khắc phục sự cố thường gặp (Bật không lên, Mất tiếng, Hú rít)

### ❗ Trường hợp 1: Tay mic không lên nguồn
- **Nguyên nhân:** Hết pin hoặc lắp ngược cực pin.
- **Xử lý:** Mở nắp pin kiểm tra chiều (+) (-). Thay ngay cặp pin mới dự phòng trong ngăn kéo bàn GV.

### ❗ Trường hợp 2: Mic bật sáng nhưng nói không ra tiếng (Lệch tần số)
- **Dấu hiệu:** Màn hình mic sáng nhưng trên đầu thu cột sóng RF không sáng vạch nào.
- **Cách đồng bộ sóng tự động bằng mắt hồng ngoại (IR):**
  1. Bật nguồn cả đầu thu và tay mic.
  2. Bấm nút SYNC hoặc IR trên mặt đầu thu. Đèn IR sẽ nhấp nháy tìm kiếm.
  3. Đưa mặt kính hiển thị của tay mic hướng thẳng vào mắt đọc IR trên đầu thu ở cự ly khoảng 10 - 15 cm.
  4. Giữ yên 3 giây cho đến khi đầu thu kêu bíp hoặc tần số trên tay mic nhảy khớp với đầu thu.

### ❗ Trường hợp 3: Loa bị hú rít chói tai khi đứng gần bục giảng
- **Nguyên nhân:** Âm lượng micro trên đầu thu vặn quá lớn hoặc hướng đầu mic thẳng vào miệng loa treo tường.
- **Xử lý:**
  1. Tuyệt đối không chĩa thẳng đầu lưới micro về hướng loa.
  2. Vặn nhẹ núm VOLUME của kênh mic tương ứng trên đầu thu ngược chiều kim đồng hồ xuống mức hướng 11 giờ - 12 giờ.
  3. Cầm mic đúng tư thế: Đặt micro cách miệng từ 3 - 5 cm.', GETDATE()),
    (2, 2, N'Hướng Dẫn Khởi Động & Chuyển Nguồn Chiếu Máy Chiếu Panasonic Laser', N'# HƯỚNG DẪN SỬ DỤNG MÁY CHIẾU PANASONIC LASER

1. **Bật máy:** Nhấn nút POWER trên điều khiển từ xa (Remote màu trắng để trên bàn GV) 1 lần. Đèn chỉ báo chuyển từ đỏ sang xanh lá.
2. **Chuyển cổng tín hiệu:**
   - Dùng cáp HDMI: Nhấn nút HDMI 1 trên remote.
   - Dùng cổng Type-C: Nhấn nút Type-C hoặc cắm adapter chuyển đổi có sẵn.
3. **Tắt máy đúng cách:** Nhấn nút POWER 2 lần liên tiếp. Để quạt làm mát tự chạy thêm 30 giây rồi mới ngắt nguồn.', GETDATE());
    SET IDENTITY_INSERT dbo.HuongDanSuDung OFF;
  `);

  // 12. Seed BaoHong
  console.log('Seeding BaoHong...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.BaoHong ON;
    INSERT INTO dbo.BaoHong (BaoHongID, NguoiBaoID, PhongHocID, ThietBiID, TieuDe, MoTa, AnhURL, MucDo, TrangThai, KyThuatVienNhanID, NgayTao, NgayCapNhat) VALUES
    (1, 3, 4, 5, N'Micro phòng A.304 bị mất tín hiệu âm thanh hoàn toàn', N'Giảng viên vào dạy tiết 1 bật micro Sisu màu xanh vẫn sáng đèn nhưng nói vào loa không phát ra âm thanh. Màn hình đầu thu không nhận vạch sóng RF.', N'/uploads/report-mic-a304.jpg', N'HIGH', N'IN_PROGRESS', 2, GETDATE(), GETDATE()),
    (2, 4, 1, NULL, N'Điều hòa phòng A.301 làm mát yếu', N'Phòng học đông sinh viên nhưng điều hòa số 2 phả gió yếu và không mát.', NULL, N'MEDIUM', N'PENDING', NULL, GETDATE(), GETDATE());
    SET IDENTITY_INSERT dbo.BaoHong OFF;
  `);

  // 13. Seed LogBaoTri
  console.log('Seeding LogBaoTri...');
  await pool.request().query(`
    SET IDENTITY_INSERT dbo.LogBaoTri ON;
    INSERT INTO dbo.LogBaoTri (LogBaoTriID, BaoHongID, KyThuatVienID, HanhDong, NgayTao) VALUES
    (1, 1, 2, N'KTV Quang đã kiểm tra: Bộ phát micro Sisu A.304 bị lệch tần số UHF. Đã thực hiện đồng bộ lại qua mắt hồng ngoại IR và thay 02 pin sạc Eneloop Pro mới. Test âm thanh đạt chuẩn.', GETDATE());
    SET IDENTITY_INSERT dbo.LogBaoTri OFF;
  `);

  console.log('=== SEED SQL SERVER COMPLETED SUCCESSFULLY! ===');
  await pool.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import {
  Building,
  Room,
  DeviceCategory,
  Device,
  Manual,
  IncidentReport,
  MaintenanceLog,
  User,
  CampusPOI
} from './types';

interface DatabaseSchema {
  pois: CampusPOI[];
  buildings: Building[];
  rooms: Room[];
  categories: DeviceCategory[];
  devices: Device[];
  manuals: Manual[];
  incident_reports: IncidentReport[];
  maintenance_logs: MaintenanceLog[];
  users: User[];
}

const DB_FILE = path.join(__dirname, 'database.json');

const INITIAL_DATA: DatabaseSchema = {
  pois: [
    { id: 'POI-GATE-1', name: 'Cổng 1 - Cổng Chính (Đường Lê Hồng Phong)', category: 'GATE', x: 420, y: 70, description: 'Lối vào chính dành cho Giảng viên, Sinh viên và Khách tham quan' },
    { id: 'POI-GATE-2', name: 'Cổng 2 - Cổng Phụ (Khu Ký Túc Xá & Gửi xe)', category: 'GATE', x: 820, y: 260, description: 'Lối vào bãi giữ xe máy sinh viên và nhà ăn' },
    { id: 'POI-PARKING-1', name: 'Nhà Xe Sinh Viên Khu A-B', category: 'PARKING', x: 800, y: 150, description: 'Bãi gửi xe 2 tầng có mái che' },
    { id: 'POI-CANTEEN', name: 'Căng Tin & Khu Dịch Vụ Sinh Viên', category: 'CANTEEN', x: 750, y: 390, description: 'Khu ăn uống, cà phê và văn phòng phẩm' },
    { id: 'POI-LIBRARY', name: 'Trung Tâm Thư Viện & Học Liệu Số', category: 'LIBRARY', x: 120, y: 220, description: 'Thư viện 3 tầng với hơn 50.000 đầu sách' },
    { id: 'POI-SPORTS', name: 'Khu Thể Thao & Sân Bóng Rổ', category: 'SPORTS', x: 120, y: 400, description: 'Sân tập thể dục và bóng rổ ngoài trời' },
    { id: 'POI-ADMIN', name: 'Tòa Nhà Điều Hành & Ban Giám Hiệu', category: 'ADMIN', x: 420, y: 180, description: 'Phòng tiếp công dân, Phòng Đào tạo & CSVC' }
  ],
  buildings: [
    { 
      id: 1, 
      building_code: 'A', 
      name: 'Tòa Nhà A - Giảng Đường Lý Thuyết', 
      description: 'Khu giảng đường chính 5 tầng gồm 40 phòng học lý thuyết được trang bị máy chiếu, micro Sisu xanh, điều hòa',
      x: 230,
      y: 280,
      width: 200,
      height: 140,
      floors: 5,
      color: '#0284c7',
      entrance_x: 330,
      entrance_y: 280
    },
    { 
      id: 2, 
      building_code: 'B', 
      name: 'Tòa Nhà B - Thực Hành & Phòng Lab CNTT', 
      description: 'Khu phòng thí nghiệm máy tính, trung tâm dữ liệu và phòng thực hành phần mềm',
      x: 520,
      y: 280,
      width: 180,
      height: 140,
      floors: 4,
      color: '#4f46e5',
      entrance_x: 610,
      entrance_y: 280
    },
    { 
      id: 3, 
      building_code: 'C', 
      name: 'Tòa Nhà C - Hội Trường Lớn & TT Sự Kiện', 
      description: 'Hội trường 500 chỗ với hệ thống âm thanh, ánh sáng biểu diễn chuyên nghiệp',
      x: 360,
      y: 470,
      width: 230,
      height: 120,
      floors: 3,
      color: '#059669',
      entrance_x: 475,
      entrance_y: 470
    }
  ],
  rooms: [
    { 
      id: 1, 
      building_id: 1, 
      room_number: 'A.301', 
      name: 'Phòng học Tiêu chuẩn A.301', 
      floor: 3, 
      qr_code: 'QR-ROOM-A301', 
      status: 'ACTIVE', 
      description: 'Sức chứa 80 sinh viên, trang bị đầy đủ máy chiếu Panasonic, mic Sisu UHF xanh, âm thanh vòm',
      x: 60,
      y: 60,
      width: 180,
      height: 120,
      room_type: 'CLASSROOM',
      door_x: 150,
      door_y: 180
    },
    { 
      id: 2, 
      building_id: 1, 
      room_number: 'A.302', 
      name: 'Phòng học Tiêu chuẩn A.302', 
      floor: 3, 
      qr_code: 'QR-ROOM-A302', 
      status: 'ACTIVE', 
      description: 'Sức chứa 80 sinh viên, trang bị máy chiếu, mic sisu xanh (đang chờ KTV thay nắp pin tay mic 1)',
      x: 270,
      y: 60,
      width: 180,
      height: 120,
      room_type: 'CLASSROOM',
      door_x: 360,
      door_y: 180
    },
    { 
      id: 6, 
      building_id: 1, 
      room_number: 'A.303', 
      name: 'Phòng học Đa năng A.303', 
      floor: 3, 
      qr_code: 'QR-ROOM-A303', 
      status: 'ACTIVE', 
      description: 'Phòng học bàn ghép nhóm tương tác, màn hình cảm ứng 85 inch',
      x: 480,
      y: 60,
      width: 180,
      height: 120,
      room_type: 'CLASSROOM',
      door_x: 570,
      door_y: 180
    },
    { 
      id: 7, 
      building_id: 1, 
      room_number: 'A.304', 
      name: 'Phòng Quản lý Kỹ thuật CSVC Tầng 3', 
      floor: 3, 
      qr_code: 'QR-ROOM-A304', 
      status: 'ACTIVE', 
      description: 'Phòng trực kỹ thuật âm thanh, pin dự phòng và bàn giao micro',
      x: 690,
      y: 60,
      width: 130,
      height: 120,
      room_type: 'OFFICE',
      door_x: 755,
      door_y: 180
    },
    { 
      id: 8, 
      building_id: 1, 
      room_number: 'STAIRS-A3-W', 
      name: 'Cầu Thang Bộ Phía Tây', 
      floor: 3, 
      qr_code: 'QR-STAIRS-A3W', 
      status: 'ACTIVE', 
      description: 'Lối cầu thang lên xuống từ Tầng 1 đến Tầng 5',
      x: 10,
      y: 60,
      width: 40,
      height: 120,
      room_type: 'STAIRS',
      door_x: 30,
      door_y: 180
    },
    { 
      id: 9, 
      building_id: 1, 
      room_number: 'STAIRS-A3-E', 
      name: 'Cầu Thang Bộ Phía Đông & Thang Máy', 
      floor: 3, 
      qr_code: 'QR-STAIRS-A3E', 
      status: 'ACTIVE', 
      description: 'Cầu thang chính và cụm thang máy giảng viên',
      x: 830,
      y: 60,
      width: 60,
      height: 120,
      room_type: 'ELEVATOR',
      door_x: 860,
      door_y: 180
    },
    { 
      id: 3, 
      building_id: 1, 
      room_number: 'A.401', 
      name: 'Phòng học Chuyên đề A.401', 
      floor: 4, 
      qr_code: 'QR-ROOM-A401', 
      status: 'MAINTENANCE', 
      description: 'Đang bảo dưỡng hệ thống điều hòa trung tâm',
      x: 60,
      y: 60,
      width: 250,
      height: 120,
      room_type: 'CLASSROOM',
      door_x: 185,
      door_y: 180
    },
    { 
      id: 4, 
      building_id: 2, 
      room_number: 'B.201', 
      name: 'Phòng Lab Máy Tính 01 (Mạng & An ninh mạng)', 
      floor: 2, 
      qr_code: 'QR-ROOM-B201', 
      status: 'ACTIVE', 
      description: '45 máy trạm Core i7, switch mạng Cisco thực hành',
      x: 60,
      y: 60,
      width: 220,
      height: 120,
      room_type: 'LAB',
      door_x: 170,
      door_y: 180
    },
    { 
      id: 10, 
      building_id: 2, 
      room_number: 'B.202', 
      name: 'Phòng Lab Máy Tính 02 (AI & Data Science)', 
      floor: 2, 
      qr_code: 'QR-ROOM-B202', 
      status: 'ACTIVE', 
      description: '40 máy trạm GPU RTX 4080 cho học phần Trí tuệ nhân tạo',
      x: 310,
      y: 60,
      width: 220,
      height: 120,
      room_type: 'LAB',
      door_x: 420,
      door_y: 180
    },
    { 
      id: 5, 
      building_id: 3, 
      room_number: 'C.101', 
      name: 'Hội trường Lớn C.101 (500 Chỗ)', 
      floor: 1, 
      qr_code: 'QR-ROOM-C101', 
      status: 'ACTIVE', 
      description: 'Hội trường 500 chỗ với hệ thống âm thanh sân khấu, 4 mic không dây và màn hình LED 400 inch',
      x: 50,
      y: 50,
      width: 400,
      height: 150,
      room_type: 'HALL',
      door_x: 250,
      door_y: 200
    }
  ],
  categories: [
    { id: 1, category_name: 'Microphone & Âm thanh', code: 'MIC', icon: 'mic', description: 'Bộ micro không dây, micro cài áo, mixer và tăng âm' },
    { id: 2, category_name: 'Máy chiếu & Màn chiếu', code: 'PROJECTOR', icon: 'projector', description: 'Máy chiếu trần, màn chiếu điện tử cuốn tự động' },
    { id: 3, category_name: 'Loa & Ampli', code: 'SPEAKER', icon: 'volume-2', description: 'Hệ thống âm ly khuếch đại và loa treo tường phòng học' },
    { id: 4, category_name: 'Điều hòa & Thông gió', code: 'AC', icon: 'wind', description: 'Máy lạnh điều hòa nhiệt độ không khí 2 chiều' },
    { id: 5, category_name: 'Bảng tương tác & Màn hình', code: 'SMARTBOARD', icon: 'tv', description: 'Bảng tương tác thông minh và màn hình LED cảm ứng' }
  ],
  devices: [
    {
      id: 1,
      room_id: 1,
      category_id: 1,
      device_code: 'MIC-A301-01',
      name: 'Bộ Micro không dây Sisu màu xanh',
      model: 'Sisu UHF Blue-Series 800',
      serial_number: 'SS-UHF-88219-BL',
      status: 'ACTIVE',
      is_portable: false,
      qr_code: 'QR-DEV-MIC-A301-01',
      purchase_date: '2024-01-15',
      warranty_expiry: '2027-01-15',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=60',
      specifications: {
        'Màu sắc tay mic': 'Màu xanh dương đậm (Blue)',
        'Dải tần số UHF': '640MHz - 690MHz (200 kênh sóng)',
        'Nguồn điện máy thu': 'Adapter 12V DC',
        'Nguồn pin tay mic': '2 x Pin AA 1.5V (thời lượng ~6-8h)',
        'Cổng kết nối âm thanh': 'Jack 6.5mm và Canon XLR ra Ampli'
      }
    },
    {
      id: 2,
      room_id: 1,
      category_id: 2,
      device_code: 'PRJ-A301-01',
      name: 'Máy chiếu Panasonic PT-LB426',
      model: 'PT-LB426 (4100 ANSI Lumens)',
      serial_number: 'PA-LB426-9021',
      status: 'ACTIVE',
      is_portable: false,
      qr_code: 'QR-DEV-PRJ-A301-01',
      purchase_date: '2023-08-10',
      warranty_expiry: '2026-08-10',
      image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60',
      specifications: {
        'Độ sáng': '4100 ANSI Lumens',
        'Độ phân giải': 'XGA (1024 x 768)',
        'Cổng nhận tín hiệu': '2 x HDMI, 1 x VGA, 1 x USB Type-A',
        'Tuổi thọ bóng đèn': '20.000 giờ ở chế độ Eco'
      }
    },
    {
      id: 3,
      room_id: 1,
      category_id: 3,
      device_code: 'AMP-A301-01',
      name: 'Âm ly Nanomax Pro-900',
      model: 'Nanomax Pro-900 Master',
      serial_number: 'NM-900-3321',
      status: 'ACTIVE',
      is_portable: false,
      qr_code: 'QR-DEV-AMP-A301-01',
      purchase_date: '2023-08-10',
      warranty_expiry: '2026-08-10',
      image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=60',
      specifications: {
        'Công suất': '450W x 2 Kênh',
        'Cổng cắm micro': '4 ngõ cắm Mic trước mặt máy'
      }
    },
    {
      id: 4,
      room_id: 1,
      category_id: 4,
      device_code: 'AC-A301-01',
      name: 'Điều hòa Daikin Inverter 2.5HP',
      model: 'FTKC60UVMV',
      serial_number: 'DK-2023-9988',
      status: 'ACTIVE',
      is_portable: false,
      qr_code: 'QR-DEV-AC-A301-01',
      purchase_date: '2023-05-20',
      warranty_expiry: '2026-05-20',
      image_url: 'https://images.unsplash.com/photo-1626244436906-791b93f2f8ec?w=800&auto=format&fit=crop&q=60'
    },
    {
      id: 5,
      room_id: 2,
      category_id: 1,
      device_code: 'MIC-A302-01',
      name: 'Bộ Micro không dây Sisu màu xanh (Phòng A.302)',
      model: 'Sisu UHF Blue-Series 800',
      serial_number: 'SS-UHF-88220-BL',
      status: 'DAMAGED',
      is_portable: false,
      qr_code: 'QR-DEV-MIC-A302-01',
      purchase_date: '2024-01-15',
      warranty_expiry: '2027-01-15',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=60',
      specifications: {
        'Màu sắc tay mic': 'Màu xanh dương đậm (Blue)',
        'Ghi chú tình trạng': 'Tay mic 1 bị gãy nắp đậy pin và có tiếng xẹt xẹt khi nói'
      }
    },
    {
      id: 6,
      room_id: 2,
      category_id: 2,
      device_code: 'PRJ-A302-01',
      name: 'Máy chiếu Epson EB-E01',
      model: 'EB-E01 3LCD',
      serial_number: 'EP-E01-4401',
      status: 'ACTIVE',
      is_portable: false,
      qr_code: 'QR-DEV-PRJ-A302-01',
      purchase_date: '2023-09-01',
      warranty_expiry: '2026-09-01',
      image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60'
    },
    {
      id: 7,
      room_id: null,
      category_id: 1,
      device_code: 'PORT-MIC-01',
      name: 'Bộ Micro di động trợ giảng Shure Kèm Loa Bluetooth',
      model: 'Shure PGX-Portable',
      serial_number: 'SH-PORT-019',
      status: 'ACTIVE',
      is_portable: true,
      qr_code: 'QR-DEV-PORT-MIC-01',
      purchase_date: '2024-02-01',
      warranty_expiry: '2026-02-01',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=60'
    }
  ],
  manuals: [
    {
      id: 1,
      category_id: 1,
      device_id: 1,
      device_code: 'MIC-A301-01',
      title: 'Hướng dẫn sử dụng & Khắc phục sự cố Bộ Micro không dây Sisu Màu Xanh (UHF)',
      summary: 'Quy trình khởi động, đồng bộ tần số sóng mắt đọc IR, thay pin và mẹo xử lý lỗi hú rít/mất tiếng trong 30 giây.',
      content_markdown: `
### 1. Giới thiệu Bộ Micro Sisu màu xanh
Bộ micro không dây **Sisu UHF Blue-Series** gồm có:
* 01 Đầu thu sóng (Receiver) đặt tại bàn giảng viên hoặc trong tủ âm thanh.
* 02 Tay micro không dây vỏ hợp kim **màu xanh dương đậm**.
* Dây cáp kết nối âm thanh 6.5mm cắm vào cổng **MIC 1 / MIC 2** của Ampli.

---

### 2. Hướng dẫn sử dụng cơ bản (3 bước chuẩn)
1. **Bước 1 - Bật nguồn Đầu thu (Receiver):**
   * Bấm nút **POWER** màu đỏ ở góc trái đầu thu. Màn hình LED màu xanh sẽ sáng lên hiển thị tần số sóng kênh **CH-A** (Tay 1) và **CH-B** (Tay 2).
2. **Bước 2 - Bật nguồn Tay Micro màu xanh:**
   * Gạt công tắc nguồn hoặc nhấn giữ nút tròn trên thân mic màu xanh khoảng **2 giây** cho đến khi màn hình nhỏ trên tay mic sáng đèn.
   * Kiểm tra cột sóng RF (Radio Frequency) và AF (Audio Frequency) trên đầu thu. Cột RF sáng nghĩa là mic và đầu thu đã kết nối tốt.
3. **Bước 3 - Kiểm tra Âm lượng & Sử dụng:**
   * Thử giọng nói nhẹ *"Alo 1, 2, 3, 4"*. Nếu âm lượng nhỏ, vặn núm **VOL-A** hoặc **VOL-B** trên đầu thu theo chiều kim đồng hồ (mức khuyến nghị: hướng 12h - 2h).

---

### 3. Cách Đồng Bộ Tần Số Khi Bị Mất Tiếng / Lệch Sóng (IR Sync)
Nếu màn hình tay mic sáng nhưng đầu thu không nhận tín hiệu (Cột RF không sáng):
* **Cách 1 - Bấm nút SET:** Trên đầu thu, bấm nút **SET** -> Đầu thu sẽ nhấp nháy chữ \`IR---\`.
* **Cách 2 - Đưa mắt đọc hồng ngoại:** Mở nắp pin của tay mic màu xanh, đưa mắt kính hồng ngoại **IR** trên thân mic lại gần cửa sổ **IR** trên mặt đầu thu (khoảng cách 5 - 10 cm).
* Chờ 3 giây, đầu thu sẽ tự động quét và đồng bộ lại tần số, âm thanh sẽ hoạt động bình thường.

---

### 4. Quy định Bảo quản & Sử dụng
* **Tuyệt đối không chĩa thẳng đầu mic vào loa treo tường** để tránh hiện tượng rú rít gây cháy loa treble.
* Sau khi dạy xong, vui lòng **tắt nguồn tay mic** (nhấn giữ 2 giây) để tiết kiệm pin.
* Nếu thấy đèn pin trên thân mic nhấp nháy báo đỏ, hãy báo kỹ thuật viên hoặc lấy pin dự phòng tại bàn trực.
      `,
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=60',
      quick_faq: [
        {
          problem: 'Bật tay mic màu xanh lên nhưng nói không ra tiếng ở loa?',
          solution: '1. Kiểm tra đầu thu xem đã bấm nút POWER chưa.\n2. Kiểm tra dây cắm 6.5mm từ sau đầu thu vào ngõ MIC của Âm ly xem có bị lỏng không.\n3. Kiểm tra xem đầu thu có nhận cột sóng RF không, nếu không hãy bấm nút SET để đồng bộ lại mắt IR.',
          quick_action: 'Bấm nút SET trên đầu thu & soi mắt IR'
        },
        {
          problem: 'Micro bị hú rít chói tai khi đứng giảng bài?',
          solution: '1. Giảm bớt núm âm lượng VOL trên đầu thu hoặc núm HI (Treble) trên Âm ly.\n2. Cầm mic đúng tư thế ở phần thân giữa, không lấy lòng bàn tay bịt kín phần lưới chụp mic.\n3. Tránh đứng quá gần hoặc đối diện trực tiếp loa treo tường.',
          quick_action: 'Giảm âm lượng & lùi xa loa'
        },
        {
          problem: 'Tiếng micro bị bập bõm, giật cục hoặc rè xẹt xẹt?',
          solution: '1. Đây là dấu hiệu tay mic sắp hết pin. Vặn nắp chuôi mic và thay 2 viên pin AA mới.\n2. Kiểm tra 2 râu ăng-ten phía sau đầu thu xem đã được dựng thẳng lên chưa.',
          quick_action: 'Thay 2 pin AA mới'
        }
      ],
      created_at: '2024-01-20'
    },
    {
      id: 2,
      category_id: 2,
      device_id: 2,
      device_code: 'PRJ-A301-01',
      title: 'Hướng dẫn sử dụng Máy chiếu Panasonic PT-LB426 & Kết nối Laptop',
      summary: 'Cách cắm dây HDMI/VGA, chuyển cổng vào tín hiệu, chỉnh nét tiêu cự và tắt máy an toàn.',
      content_markdown: `
### 1. Quy trình bật máy chiếu & nhận tín hiệu
1. Cắm dây nguồn và dây HDMI (hoặc VGA) từ bàn giáo viên vào Laptop.
2. Nhấn nút **POWER** trên remote hoặc trên thân máy chiếu (đèn chuyển từ Cam sang Xanh lá).
3. Trên Laptop: Nhấn tổ hợp phím **Windows + P** -> Chọn chế độ **Duplicate** (Nhân bản màn hình).
4. Nếu máy chiếu chưa lên hình: Nhấn nút **INPUT SELECT** trên remote và chọn cổng tương ứng: \`HDMI 1\` hoặc \`Computer 1\`.

### 2. Chỉnh độ nét (Focus) & Khung hình
* Vặn vòng gạt **FOCUS** trên ống kính máy chiếu cho đến khi chữ trên màn chiếu sắc nét.
* Sử dụng nút **KEYSTONE** trên remote nếu hình ảnh bị méo góc hình thang.

### 3. Tắt máy chiếu an toàn
* Nhấn nút **POWER** 2 lần liên tiếp.
* **LƯU Ý:** Tuyệt đối không ngắt cầu dao điện ngay. Phải chờ quạt tản nhiệt quay làm mát bóng đèn trong 1 - 2 phút cho đến khi đèn báo về màu Cam tĩnh mới ngắt điện.
      `,
      image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60',
      quick_faq: [
        {
          problem: 'Cắm HDMI vào Laptop nhưng màn chiếu báo "No Signal"?',
          solution: '1. Bấm Windows + P trên Laptop và chọn "Duplicate".\n2. Nhấn nút INPUT trên remote máy chiếu để chuyển đúng kênh HDMI 1.\n3. Rút cáp HDMI cắm chặt lại vào cổng laptop.',
          quick_action: 'Bấm Windows + P -> Duplicate'
        },
        {
          problem: 'Hình ảnh bị mờ không đọc rõ chữ?',
          solution: 'Vặn nhẹ vòng tròn FOCUS ở phần ống kính phía trên máy chiếu đến khi nét rõ.',
          quick_action: 'Xoay vòng gạt Focus'
        }
      ],
      created_at: '2024-01-20'
    }
  ],
  incident_reports: [
    {
      id: 1,
      report_code: 'INC-202608-001',
      room_id: 2,
      device_id: 5,
      reporter_name: 'ThS. Nguyễn Văn Hùng',
      reporter_phone: '0912.345.678',
      reporter_role: 'Giảng viên CNTT',
      title: 'Micro Sisu màu xanh phòng A.302 bị vỡ nắp pin và phát tiếng rè',
      description: 'Trong tiết học sáng nay tay mic màu xanh số 1 phát ra tiếng rè lớn khi giảng bài, nắp đậy pin bị gãy ren không giữ chặt pin được. Đề nghị kỹ thuật thay thế tay mic dự phòng để kịp tiết dạy chiều.',
      image_urls: [
        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=60'
      ],
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigned_technician_name: 'KTV. Trần Minh Quang',
      solution_note: 'Đã nhận bàn giao tay mic, đang tiến hành thay thế nắp pin và test lại củ mic.',
      created_at: '2026-08-28 09:30:00',
      room_name: 'A.302',
      device_name: 'Bộ Micro không dây Sisu màu xanh (Phòng A.302)'
    },
    {
      id: 2,
      report_code: 'INC-202608-002',
      room_id: 3,
      device_id: null,
      reporter_name: 'TS. Lê Thị Mai',
      reporter_phone: '0988.112.233',
      reporter_role: 'Giảng viên Ngoại ngữ',
      title: 'Điều hòa phòng A.401 chảy nước xuống sàn',
      description: 'Cục lạnh điều hòa góc phải phòng A.401 bị nhỏ nước xuống dãy bàn học sinh viên, cần thông tắc đường ống xả nước gấp.',
      image_urls: [],
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assigned_technician_name: 'KTV. Lê Hoàng Phúc',
      created_at: '2026-08-28 14:15:00',
      room_name: 'A.401'
    }
  ],
  maintenance_logs: [
    {
      id: 1,
      report_id: null,
      device_id: 1,
      technician_name: 'KTV. Trần Minh Quang',
      action_taken: 'Bảo dưỡng định kỳ đầu học kỳ: Vệ sinh lưới lọc bụi củ mic Sisu màu xanh, tra dung dịch tiếp xúc socket pin, thay cặp pin sạc mới Eneloop Pro.',
      parts_replaced: '02 Pin sạc Eneloop Pro AA',
      cost: 160000,
      performed_at: '2026-08-15 10:00:00',
      note: 'Âm thanh thu tốt, sóng UHF ổn định không bị nhiễu chéo kênh.',
      device_name: 'Bộ Micro không dây Sisu màu xanh'
    }
  ],
  users: [
    { id: 1, role_name: 'ADMIN', full_name: 'Quản trị viên Hệ thống (Admin)', email: 'admin@school.edu.vn', phone: '0909.000.001', created_at: '2024-01-01' },
    { id: 2, role_name: 'TECHNICIAN', full_name: 'KTV. Trần Minh Quang', email: 'quang.tm@school.edu.vn', phone: '0909.000.002', created_at: '2024-01-01' },
    { id: 3, role_name: 'TEACHER', full_name: 'ThS. Nguyễn Văn Hùng', email: 'hung.nv@school.edu.vn', phone: '0912.345.678', created_at: '2024-01-01' }
  ]
};

export class Database {
  private static data: DatabaseSchema = INITIAL_DATA;

  public static init() {
    try {
      this.data = INITIAL_DATA;
      this.save();
    } catch (e) {
      console.warn('Using in-memory database backup:', e);
      this.data = INITIAL_DATA;
    }
  }

  private static save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  public static getPois(): CampusPOI[] {
    return this.data.pois || [];
  }

  public static getBuildings(): Building[] {
    return this.data.buildings;
  }

  public static getRooms(buildingId?: number, floor?: number): Room[] {
    let rooms = this.data.rooms;
    if (buildingId) rooms = rooms.filter(r => r.building_id === buildingId);
    if (floor) rooms = rooms.filter(r => r.floor === floor);

    return rooms.map(r => {
      const b = this.data.buildings.find(building => building.id === r.building_id);
      const pendingCount = this.data.incident_reports.filter(
        rep => rep.room_id === r.id && (rep.status === 'PENDING' || rep.status === 'IN_PROGRESS' || rep.status === 'ASSIGNED')
      ).length;
      return { 
        ...r, 
        building_code: b ? b.building_code : '',
        pendingReportsCount: pendingCount
      };
    });
  }

  public static getRoomById(id: number): (Room & { devices: Device[]; pendingReportsCount: number }) | null {
    const room = this.data.rooms.find(r => r.id === id);
    if (!room) return null;
    const devices = this.getDevicesByRoomId(id);
    const b = this.data.buildings.find(building => building.id === room.building_id);
    const pendingReportsCount = this.data.incident_reports.filter(
      rep => rep.room_id === id && (rep.status === 'PENDING' || rep.status === 'IN_PROGRESS' || rep.status === 'ASSIGNED')
    ).length;

    return { ...room, building_code: b ? b.building_code : '', devices, pendingReportsCount };
  }

  public static getRoomByQr(qrCode: string): Room | null {
    return this.data.rooms.find(r => r.qr_code.toLowerCase() === qrCode.toLowerCase()) || null;
  }

  public static getCategories(): DeviceCategory[] {
    return this.data.categories;
  }

  public static getDevices(categoryId?: number, status?: string): Device[] {
    let devices = this.data.devices;
    if (categoryId) devices = devices.filter(d => d.category_id === categoryId);
    if (status) devices = devices.filter(d => d.status === status);

    return devices.map(d => {
      const cat = this.data.categories.find(c => c.id === d.category_id);
      const room = this.data.rooms.find(r => r.id === d.room_id);
      return {
        ...d,
        category_name: cat ? cat.category_name : '',
        room_name: room ? room.room_number : 'Kho lưu động'
      };
    });
  }

  public static getDevicesByRoomId(roomId: number): Device[] {
    return this.getDevices().filter(d => d.room_id === roomId);
  }

  public static getDeviceById(id: number): (Device & { manual?: Manual | null; history?: MaintenanceLog[] }) | null {
    const dev = this.data.devices.find(d => d.id === id);
    if (!dev) return null;
    const cat = this.data.categories.find(c => c.id === dev.category_id);
    const room = this.data.rooms.find(r => r.id === dev.room_id);
    const manual = this.getManualByDeviceId(dev.id) || this.getManualByCategoryId(dev.category_id);
    const history = this.data.maintenance_logs.filter(m => m.device_id === id);

    return {
      ...dev,
      category_name: cat ? cat.category_name : '',
      room_name: room ? room.room_number : 'Kho lưu động',
      manual: manual || null,
      history
    };
  }

  public static getDeviceByQr(qrCode: string): Device | null {
    return this.data.devices.find(d => d.qr_code.toLowerCase() === qrCode.toLowerCase()) || null;
  }

  public static addDevice(device: Omit<Device, 'id'>): Device {
    const newId = this.data.devices.length ? Math.max(...this.data.devices.map(d => d.id)) + 1 : 1;
    const newDevice: Device = { ...device, id: newId };
    this.data.devices.push(newDevice);
    this.save();
    return newDevice;
  }

  public static updateDeviceStatus(id: number, status: Device['status']): Device | null {
    const dev = this.data.devices.find(d => d.id === id);
    if (dev) {
      dev.status = status;
      this.save();
      return dev;
    }
    return null;
  }

  public static getManuals(): Manual[] {
    return this.data.manuals;
  }

  public static getManualById(id: number): Manual | null {
    return this.data.manuals.find(m => m.id === id) || null;
  }

  public static getManualByDeviceId(deviceId: number): Manual | null {
    return this.data.manuals.find(m => m.device_id === deviceId) || null;
  }

  public static getManualByCategoryId(categoryId: number): Manual | null {
    return this.data.manuals.find(m => m.category_id === categoryId && m.device_id === null) || null;
  }

  public static getIncidentReports(status?: string, roomId?: number): IncidentReport[] {
    let reports = this.data.incident_reports;
    if (status) reports = reports.filter(r => r.status === status);
    if (roomId) reports = reports.filter(r => r.room_id === roomId);

    return reports.map(r => {
      const room = this.data.rooms.find(rm => rm.id === r.room_id);
      const dev = r.device_id ? this.data.devices.find(d => d.id === r.device_id) : null;
      return {
        ...r,
        room_name: room ? room.room_number : '',
        device_name: dev ? dev.name : 'Sự cố phòng chung'
      };
    });
  }

  public static createIncidentReport(payload: {
    room_id: number;
    device_id?: number | null;
    reporter_name: string;
    reporter_phone: string;
    reporter_role?: string;
    title: string;
    description: string;
    image_urls?: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }): IncidentReport {
    const newId = this.data.incident_reports.length ? Math.max(...this.data.incident_reports.map(r => r.id)) + 1 : 1;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const report_code = `INC-${dateStr}-${String(newId).padStart(3, '0')}`;

    const newReport: IncidentReport = {
      id: newId,
      report_code,
      room_id: payload.room_id,
      device_id: payload.device_id || null,
      reporter_name: payload.reporter_name,
      reporter_phone: payload.reporter_phone,
      reporter_role: payload.reporter_role || 'Giảng viên',
      title: payload.title,
      description: payload.description,
      image_urls: payload.image_urls || [],
      priority: payload.priority || 'MEDIUM',
      status: 'PENDING',
      created_at: now.toISOString().replace('T', ' ').slice(0, 19)
    };

    this.data.incident_reports.unshift(newReport);

    if (payload.device_id) {
      this.updateDeviceStatus(payload.device_id, 'DAMAGED');
    }

    this.save();
    return newReport;
  }

  public static updateIncidentStatus(
    id: number,
    status: IncidentReport['status'],
    technicianName?: string,
    solutionNote?: string
  ): IncidentReport | null {
    const report = this.data.incident_reports.find(r => r.id === id);
    if (!report) return null;

    report.status = status;
    if (technicianName) report.assigned_technician_name = technicianName;
    if (solutionNote) report.solution_note = solutionNote;

    if (status === 'RESOLVED') {
      report.resolved_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
      if (report.device_id) {
        this.updateDeviceStatus(report.device_id, 'ACTIVE');
      }
    }

    this.save();
    return report;
  }

  public static getMaintenanceLogs(): MaintenanceLog[] {
    return this.data.maintenance_logs.map(log => {
      const dev = this.data.devices.find(d => d.id === log.device_id);
      return { ...log, device_name: dev ? dev.name : '' };
    });
  }

  public static addMaintenanceLog(payload: Omit<MaintenanceLog, 'id' | 'performed_at'>): MaintenanceLog {
    const newId = this.data.maintenance_logs.length ? Math.max(...this.data.maintenance_logs.map(l => l.id)) + 1 : 1;
    const newLog: MaintenanceLog = {
      ...payload,
      id: newId,
      performed_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    this.data.maintenance_logs.unshift(newLog);
    this.save();
    return newLog;
  }

  public static getDashboardStats() {
    const totalRooms = this.data.rooms.length;
    const totalDevices = this.data.devices.length;
    const activeDevices = this.data.devices.filter(d => d.status === 'ACTIVE').length;
    const damagedDevices = this.data.devices.filter(d => d.status === 'DAMAGED').length;
    const underMaintenanceDevices = this.data.devices.filter(d => d.status === 'UNDER_MAINTENANCE').length;
    const pendingReports = this.data.incident_reports.filter(r => r.status === 'PENDING').length;
    const resolvedReports = this.data.incident_reports.filter(r => r.status === 'RESOLVED').length;

    return {
      totalRooms,
      totalDevices,
      activeDevices,
      damagedDevices,
      underMaintenanceDevices,
      pendingReports,
      resolvedReports,
      deviceHealthRatio: totalDevices ? Math.round((activeDevices / totalDevices) * 100) : 100
    };
  }
}

Database.init();
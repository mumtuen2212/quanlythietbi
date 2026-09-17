# Hệ Thống Quản Lý Thiết Bị Trường Học & Giảng Đường (EduDevice CSVC)

Hệ thống Fullstack hỗ trợ tra cứu thiết bị phòng học, hướng dẫn sử dụng thiết bị (nổi bật bộ micro không dây Sisu màu xanh), quét mã QR code và báo hỏng 1-chạm dành cho trường học.

## Cấu Trúc Dự Án
- `server/`: Backend RESTful API viết bằng Node.js + Express + TypeScript + SQLite.
- `client/`: Frontend giao diện người dùng viết bằng React + Vite + TailwindCSS + Lucide Icons + QR Scanner.

## Hướng Dẫn Khởi Chạy

### 1. Khởi động Backend (Terminal 1)
```powershell
cd server
npm run dev
```
Backend sẽ lắng nghe tại: `http://localhost:5000`

### 2. Khởi động Frontend (Terminal 2)
```powershell
cd client
npm run dev
```
Giao diện Web sẽ chạy tại: `http://localhost:3000`

## Chạy thử như App trên điện thoại Android
Dự án đã có sẵn Android project Capacitor trong `client/android/`. Các bước nhanh để chạy thử trên điện thoại hoặc emulator:

1. Khởi động backend trên máy laptop/PC và truy cập qua IP máy nội bộ, ví dụ:
```powershell
cd server
npm run dev
```
Nếu muốn điện thoại truy cập máy đang chạy backend qua Wi-Fi, hãy lấy IP LAN của máy:
```powershell
ipconfig
```
Ghi lại IPv4, ví dụ `192.168.1.20`.

2. Tạo file biến môi trường cho frontend:
```powershell
cd client
copy .env.example .env
```
Trong file `.env`, thêm:
```env
VITE_API_BASE_URL=http://192.168.1.20:5000/api
```
Thay `192.168.1.20` bằng IP LAN của máy bạn.

3. Build frontend thành app web tĩnh:
```powershell
cd client
npm run build
```

4. Đồng bộ Capacitor với Android:
```powershell
cd client
npx cap sync android
```

5. Chạy thử trên Android Studio hoặc điện thoại thực:
```powershell
cd client
npx cap open android
```
Nếu đã cắm điện thoại qua USB và bật USB Debugging, chạy luôn:
```powershell
cd client
npx cap run android
```

> Lưu ý: Backend phải chạy liên tục ở máy chủ, và điện thoại cần cùng mạng Wi-Fi hoặc dùng USB debug để cắm trực tiếp.

## Các Tính Năng Nổi Bật
1. **Sơ đồ Phòng học & Thiết bị:** Xem danh sách thiết bị chi tiết theo từng phòng (Micro Sisu xanh, Máy chiếu Panasonic, Âm ly, Điều hòa...).
2. **Thư viện Hướng dẫn sử dụng:** Hướng dẫn bật nguồn, chỉnh tần số sóng UHF, đồng bộ mắt hồng ngoại IR và xử lý mất tiếng/hú rít cho Micro Sisu màu xanh.
3. **Báo hỏng 1-chạm:** Tạo phiếu báo hỏng có đính kèm ảnh minh chứng và phân loại mức độ khẩn cấp.
4. **Quét mã QR:** Mở camera quét mã QR dán trên bàn giáo viên hoặc dán trên thiết bị.
5. **Kỹ thuật viên & Quản trị:** Tiếp nhận phiếu báo hỏng, cập nhật tiến độ, ghi log bảo trì và xuất tem QR.

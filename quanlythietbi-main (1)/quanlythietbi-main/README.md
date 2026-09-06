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

## Các Tính Năng Nổi Bật
1. **Sơ đồ Phòng học & Thiết bị:** Xem danh sách thiết bị chi tiết theo từng phòng (Micro Sisu xanh, Máy chiếu Panasonic, Âm ly, Điều hòa...).
2. **Thư viện Hướng dẫn sử dụng:** Hướng dẫn bật nguồn, chỉnh tần số sóng UHF, đồng bộ mắt hồng ngoại IR và xử lý mất tiếng/hú rít cho Micro Sisu màu xanh.
3. **Báo hỏng 1-chạm:** Tạo phiếu báo hỏng có đính kèm ảnh minh chứng và phân loại mức độ khẩn cấp.
4. **Quét mã QR:** Mở camera quét mã QR dán trên bàn giáo viên hoặc dán trên thiết bị.
5. **Kỹ thuật viên & Quản trị:** Tiếp nhận phiếu báo hỏng, cập nhật tiến độ, ghi log bảo trì và xuất tem QR.

# Hệ Thống Quản Lý Thiết Bị Trường Học & Giảng Đường (EduDevice CSVC)

Hệ thống Fullstack hỗ trợ tra cứu thiết bị phòng học, hướng dẫn sử dụng thiết bị (nổi bật bộ micro không dây Sisu màu xanh), quét mã QR code và báo hỏng 1-chạm dành cho trường học.

## Cấu Trúc Dự Án
- `server/`: Backend RESTful API viết bằng Node.js + Express + TypeScript, lưu dữ liệu trên Neon PostgreSQL.
- `client/`: Frontend giao diện người dùng viết bằng React + Vite + TailwindCSS + Lucide Icons + QR Scanner.

## Deploy Render + Neon

1. Tạo database PostgreSQL trên Neon và sao chép **pooled connection string** (hostname thường có `-pooler`).
2. Đưa repository lên GitHub và tạo dịch vụ từ `render.yaml`, hoặc tạo Render Blueprint.
3. Trong Render, thiết lập các biến cho API service:
   - `DATABASE_URL`: pooled connection string từ Neon.
   - `JWT_SECRET`: chuỗi ngẫu nhiên dài, riêng cho production.
   - `GOOGLE_CLIENT_ID`: OAuth client ID từ Google Cloud Console.
   - `PGSSL=true`.
4. Thiết lập `VITE_GOOGLE_CLIENT_ID` trên static site thành **cùng giá trị** với `GOOGLE_CLIENT_ID` trên API. Biến `VITE_...` được nhúng lúc build, nên lưu biến và deploy lại static site sau khi cập nhật.
5. Trong Google Cloud Console, bật Google Identity Services và thêm origin của website production (và `http://localhost:3000` khi chạy local) vào mục **Authorized JavaScript origins** của OAuth Web client. Không thêm `/login` hoặc `/api` vào origin. API URL đã được nối tự động từ Render service trong blueprint.
6. Render Free dùng filesystem tạm thời; ảnh tải lên có thể mất sau khi service khởi động lại hoặc deploy. Nếu cần giữ ảnh, gắn persistent disk vào API service và đặt `UPLOADS_DIR` trùng với mount path.
7. Nếu Neon chưa có dữ liệu khuôn viên, dùng Render Shell cho API service để nhập dữ liệu và thiết bị mẫu; sau đó tạo tài khoản quản trị:
```sh
npm run import:campus
npm run seed:room-equipment
SEED_ADMIN_USERNAME=admin SEED_ADMIN_PASSWORD='your-long-password' SEED_ADMIN_EMAIL=admin@example.com npm run seed:admin
```
`import:campus` chỉ nhập khi bảng tòa nhà đang trống và sẽ dừng nếu đã có dữ liệu; không chạy lệnh này trên database đang sử dụng. `seed:room-equipment` có thể chạy lại an toàn. Backend tạo schema và các bảng PostgreSQL tự động khi kết nối Neon lần đầu.

## Chạy local

Tạo `server/.env` từ `server/.env.example`, thay `DATABASE_URL` bằng connection string Neon (bật SSL; dùng pooled connection string trên Render) và đặt `JWT_SECRET` riêng. Tạo `client/.env` từ `client/.env.example` để frontend gọi API local qua Vite proxy. Trên Render, blueprint đặt `VITE_API_BASE_URL` trỏ tới API service với đường dẫn `/api`; không dùng giá trị `/api` của môi trường local làm biến build cho static site.

### 1. Khởi động Backend (Terminal 1)
```powershell
cd server
npm run dev
```
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.

### 2. Khởi động Frontend (Terminal 2)
```powershell
cd client
npm run dev
```
Giao diện Web sẽ chạy tại: `http://localhost:3000`

## Chạy thử như App trên điện thoại Android
Dự án đã có sẵn Android project Capacitor trong `client/android/`. Các bước nhanh để chạy thử trên điện thoại hoặc emulator:

### Đóng gói APK dùng API Render + Neon
APK phải được build với URL HTTPS của API Render; `.env` dùng `/api` cho Vite proxy local không phù hợp với ứng dụng đã đóng gói trên điện thoại. Từ PowerShell:
```powershell
cd client
$env:VITE_API_BASE_URL = "https://quanlythietbi-main.onrender.com/api"
npm run build:android-apk
```
Lệnh kiểm tra URL, build web, đồng bộ Capacitor rồi tạo debug APK tại `client/android/app/build/outputs/apk/debug/app-debug.apk`. Nếu hostname API Render thay đổi, cập nhật URL trên. Nếu bật Google login, đặt thêm `$env:VITE_GOOGLE_CLIENT_ID` trước khi build và dùng cùng OAuth Client ID đã cấu hình trên API Render.

Gradle được giới hạn một worker và heap 1 GB để giảm nguy cơ hết RAM trên máy 4 GB. Yêu cầu JDK 21 và Android SDK; đường dẫn SDK phải được cấu hình riêng trong `client/android/local.properties` (file này không đưa lên Git).

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

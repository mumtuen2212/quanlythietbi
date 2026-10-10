# Hệ Thống Quản Lý Thiết Bị Trường Học & Giảng Đường (EduDevice CSVC)

Hệ thống Fullstack hỗ trợ tra cứu thiết bị phòng học, hướng dẫn sử dụng thiết bị (nổi bật bộ micro không dây Sisu màu xanh), quét mã QR code và báo hỏng 1-chạm dành cho trường học.

## Cấu Trúc Dự Án
- `server/`: Backend RESTful API viết bằng Node.js + Express + TypeScript, lưu dữ liệu trên Neon PostgreSQL.
- `client/`: Frontend giao diện người dùng viết bằng React + Vite + TailwindCSS + Lucide Icons + QR Scanner.

## Deploy Render + Neon
<<<<<<< Updated upstream

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
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
=======
=======
=======
>>>>>>> Stashed changes

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
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521

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
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521

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
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521

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
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521

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
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521

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
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521

Hướng dẫn các chỗ cần sửa khi đổi link database hoặc API: [Cấu hình kết nối](docs/CAU_HINH_KET_NOI.md). Link PostgreSQL chỉ đặt ở server và Environment của API Render, không đưa vào client/APK. Đổi database không tự chuyển dữ liệu cũ.

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

### Chỉ đường nội khu và tạo tem QR

- Chỉ đường hiển thị ngay trên Leaflet, không mở Google Maps. `client/src/data/campusWalkways.json` chứa các đoạn lối đi thật lấy từ API OpenStreetMap ngày 09/10/2026, khu vực cơ sở chính TDMU. Nguồn: OpenStreetMap contributors, giấy phép ODbL 1.0 (https://www.openstreetmap.org/copyright). Khi khuôn viên thay đổi, cần cập nhật dữ liệu đường.
- Tuyến dùng đường ngắn nhất trên các đoạn đã nối trong dữ liệu. Điểm bắt đầu/kết thúc được chiếu lên lối đi gần nhất; không vẽ đoạn nối vào tâm phòng/tòa nhà. Không có lối đi hoặc vị trí quá xa thì báo lỗi, không dùng đường thẳng giả. Khoảng cách chỉ tính phần lối đi ngoài tòa; chưa phải chỉ dẫn trong tầng hay xác nhận cổng đang mở.
- Trang QR tải danh sách phòng/thiết bị thật. `POST /api/qr/create` kiểm tra đăng nhập và quyền `MANAGE_ROOMS` / `MANAGE_DEVICES` tương ứng (admin có cả hai), lưu mã nếu chưa có, giữ mã đã in, kiểm tra trùng và trả nội dung để tải tem SVG. Quyền tạo được kiểm tra ở server, không chỉ ẩn nút trên giao diện.
- Kiểm tra hồi quy từ thư mục gốc: `server/node_modules/.bin/tsx --test client/tests/campusRouting.test.ts server/tests/qrPolicy.test.ts` (PowerShell dùng `server/node_modules/.bin/tsx.cmd`). Các bài kiểm tra không ghi vào SQL.

Mặc định frontend trên máy gọi cùng API Render với website online để dùng chung dữ liệu Neon và cùng nơi lưu ảnh. Tạo `client/.env` từ `client/.env.example`, dùng `VITE_API_BASE_URL=/api` và đặt `VITE_API_PROXY_TARGET` thành URL API Render đang dùng (không thêm `/api`). Không cần khởi động backend local trong chế độ này.

Trên Render, đặt `VITE_API_BASE_URL` của frontend thành URL tuyệt đối của **cùng API**, có đường dẫn `/api`, rồi build/deploy lại frontend. Giá trị `/api` ở máy local hoạt động nhờ Vite proxy; static site online không có proxy này. Không đưa `DATABASE_URL` hoặc mật khẩu SQL vào bất kỳ biến `VITE_...` nào.

### 1. Khởi động Backend local (chỉ khi phát triển backend)
Nếu cần chạy backend trên máy, tạo `server/.env` từ `server/.env.example` và dùng **cùng `DATABASE_URL` với API Render**, bao gồm cùng Neon project, branch và database. Đặt `PGSSL=true`, cấu hình `JWT_SECRET`, cài thư viện bằng `npm install`, sau đó chạy:
```powershell
cd server
npm run dev
```
<<<<<<< Updated upstream
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
Backend sẽ lắng nghe tại: `http://localhost:5000`. Chỉ trong chế độ phát triển backend, đổi `VITE_API_PROXY_TARGET=http://localhost:5000` rồi khởi động lại Vite. Dữ liệu SQL vẫn dùng chung nếu connection string giống Render, nhưng ảnh lưu trên máy không tự đồng bộ với ảnh trên Render. Muốn dùng chung cả ảnh, giữ frontend trỏ về API Render.
=======
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
Backend sẽ lắng nghe tại: `http://localhost:5000`. Bản mẫu `client/.env.example` cấu hình Vite chuyển tiếp `/api` và `/uploads` tới địa chỉ này; nếu API chạy ở nơi khác, cập nhật `VITE_API_PROXY_TARGET`.
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
>>>>>>> Stashed changes

### 2. Khởi động Frontend
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

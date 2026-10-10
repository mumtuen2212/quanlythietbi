# Các chỗ cần sửa khi đổi kết nối database hoặc địa chỉ API

## 1. Nếu chỉ đổi link Neon / PostgreSQL

Link PostgreSQL là cấu hình của **server**, không phải của web hoặc APK.

Các nơi phải dùng cùng một giá trị `DATABASE_URL`:

| Nơi chạy server | Chỗ cần sửa |
| --- | --- |
| Bản dự án hiện tại trên máy | `D:\doancosonganh\quanlythietbi\server\.env` |
| Bản dự án ở thư mục khác, nếu vẫn sử dụng | `D:\quanlythietbi\server\.env` |
| API online của APK và website | Render Dashboard → Web Service có URL `quanlythietbi-main.onrender.com` → Environment → `DATABASE_URL` |

Ví dụ định dạng (thay bằng link thật của bạn, không dùng nguyên mẫu này):

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require
PGSSL=true
```

Trên Neon, lấy link ở **Connect**, chọn đúng project, branch và database trước khi sao chép. Hai link cùng tên `neondb` chưa chắc cùng database nếu khác máy chủ/branch.

Sau khi thay:

1. Server trên máy: dừng `npm run dev` bằng Ctrl+C rồi chạy lại trong thư mục `server` của đúng bản dự án.
2. Server Render: lưu biến môi trường và chọn **Save and deploy** để bản server đang chạy nhận cấu hình mới. Chỉ **Save only** thì chưa áp dụng ngay. Nếu mã server cũng thay đổi, đưa mã mới lên repository được Render sử dụng và build/deploy lại.
3. Mở lại app, đăng xuất/đăng nhập nếu tài khoản ở database mới khác database cũ.
4. Đối chiếu phiếu báo hỏng trên app với bảng `public."BaoHong"` của đúng nhánh Neon.

**Không cần tạo lại APK nếu URL API vẫn giữ nguyên.** Không sửa link PostgreSQL trong `client/src/services/api.ts`, `client/vite.config.ts` hoặc project Android. Không đặt `DATABASE_URL` trong biến `VITE_...`: các biến đó được đưa vào mã web/APK và có thể bị đọc.

**Đổi kết nối không sao chép dữ liệu.** Phiếu, thiết bị và tài khoản ở database cũ vẫn ở database cũ; muốn chuyển dữ liệu cần sao lưu và thực hiện một bước chuyển riêng. Không tự chạy seed/import hoặc xóa database để xử lý lệch dữ liệu.

## 2. Nếu đổi cả địa chỉ API Render

Đây là link HTTPS, ví dụ `https://ten-api-moi.onrender.com`, khác link PostgreSQL.

### Web chạy trên máy bằng Vite

Sửa `client/.env`:

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=https://ten-api-moi.onrender.com
```

`VITE_API_PROXY_TARGET` không thêm `/api`. Khởi động lại `npm run dev` sau khi thay `.env`.

Muốn thử backend trên máy, dùng `VITE_API_PROXY_TARGET=http://localhost:5000`; backend local vẫn phải có đúng `DATABASE_URL`. Ảnh tải lên máy local không tự chuyển sang Render.

### Website online

Trong Environment của Render **Static Site**, đặt:

```env
VITE_API_BASE_URL=https://ten-api-moi.onrender.com/api
```

Build/deploy lại Static Site để mã web nhận URL mới.

### APK

Chạy PowerShell trong thư mục `D:\doancosonganh\quanlythietbi\client`:

```powershell
$env:VITE_API_BASE_URL="https://ten-api-moi.onrender.com/api"
npm run build:android-apk
```

Sau đó cài APK mới. Biến `$env:...` chỉ tồn tại trong terminal đó; mở terminal mới thì đặt lại. API phải dùng HTTPS và có đuôi `/api`.

Nếu vẫn dùng bản dự án `D:\quanlythietbi`, kiểm tra riêng cấu hình của bản đó; việc sửa file ở một thư mục không tự sửa bản còn lại. Nên dùng một bản dự án chính để tránh build APK từ mã cũ.

## 3. Bảo vệ mật khẩu

- Không đưa file `server/.env`, mật khẩu hoặc chuỗi kết nối đầy đủ lên GitHub, ảnh chụp màn hình hay chat.
- `.env.example` chỉ là mẫu, không phải cấu hình đang chạy; không điền mật khẩu thật vào đó.
- Nếu mật khẩu đã bị chia sẻ, đổi mật khẩu trên Neon rồi cập nhật `DATABASE_URL` ở các server nêu trên.
- Render không tự lấy thay đổi `server/.env` trong máy; phải cập nhật Environment trên Render riêng.

Tài liệu Render về các lựa chọn lưu biến môi trường: https://render.com/docs/configure-environment-variables

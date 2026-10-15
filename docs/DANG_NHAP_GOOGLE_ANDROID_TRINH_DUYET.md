# Đăng nhập Google trong APK bằng trình duyệt hệ thống

## Luồng mới

APK gọi API tạo phiên → mở Google trong Chrome Custom Tabs → Google trả mã về callback HTTPS của server → server xác minh Google → chuyển về `quanlythietbi://auth/google` → APK đổi mã dùng một lần bằng chứng minh S256 → server trả JWT và tài khoản.

Đăng nhập Google trên website giữ nguyên. Tài khoản nằm trên cùng Neon, không tạo database riêng. Client Secret chỉ đặt ở server, không đưa vào APK, client/.env, chat hoặc GitHub.

## 1. Cập nhật mã nguồn trên Render

Cần đưa mã mới của **server** lên repository mà service `doancosonganh` đang dùng và deploy lại. APK mới không thể chạy luồng này với backend cũ. Không cần deploy website chỉ để dùng luồng Android mới.

## 2. Cấu hình Google Cloud

Trong Google Auth Platform → Clients, mở **Web application client đang dùng cho website**. Không tạo Android client cho luồng này và không thay Client ID đang hoạt động.

Giữ lại Authorized JavaScript origins của website. Trong **Authorized redirect URIs** (khác mục JavaScript origins), thêm chính xác:

```text
https://doancosonganh.onrender.com/api/auth/google/mobile/callback
```

Không thêm dấu `/` cuối, `/#/login` hay custom scheme của app vào mục này. Google chỉ quay về callback HTTPS của backend; backend mới chuyển tiếp về app. Bấm Save. Nếu OAuth đang ở chế độ Testing, thêm tài khoản demo vào Test users khi Google yêu cầu.

Lấy Client Secret của chính Web client đó. Nếu không còn xem được secret, kiểm tra cách quản lý/tạo secret của Google Cloud; không xóa Web client đang dùng. Không gửi ảnh lộ secret.

## 3. Cấu hình server trên Render

Mở `doancosonganh` → Environment. Giữ DATABASE_URL, JWT_SECRET và các biến cũ. Thêm/kiểm tra:

| KEY | VALUE |
| --- | --- |
| GOOGLE_CLIENT_ID | Web Client ID đang dùng, cùng giá trị VITE_GOOGLE_CLIENT_ID của website |
| GOOGLE_CLIENT_SECRET | Client Secret của chính Web client đó |
| GOOGLE_MOBILE_REDIRECT_URI | https://doancosonganh.onrender.com/api/auth/google/mobile/callback |

Save, rebuild, and deploy. Client Secret không phải JWT_SECRET hoặc Client ID. Callback phải khớp tuyệt đối Google Cloud. Khi dùng API khác, phải đổi callback trên cả hai nơi.

## 4. Tạo và cài APK mới

Trong PowerShell tại thư mục client:

```powershell
cd D:\doancosonganh\quanlythietbi\client
$env:VITE_API_BASE_URL="https://doancosonganh.onrender.com/api"
npm run build:android-apk
```

Gradle 8.14.3 của dự án cần bản Java tương thích. JBR đi kèm Android Studio hiện là Java 25 và không dùng được với Gradle này. Mình dùng **JDK 21 portable chính thức của Microsoft**, đã đối chiếu SHA-256. Không thay Java toàn hệ thống hoặc Android Studio. Trên máy này, đặt:

```powershell
$env:JAVA_HOME="C:\Users\Bien\.codex\visualizations\2026\09\22\01a0c7a1-9d31-72e3-a5a8-32631e6b265b\google-browser-build-2026-10-14\jdk21\jdk-21.0.12.1+1"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
```

Đặt hai biến Java trước khi chạy lệnh build trong cùng Terminal. Nếu chuyển máy, cài/giải nén JDK 21 và thay đường dẫn phù hợp, không sao chép nguyên đường dẫn trên.

Chỉ lấy APK sau BUILD SUCCESSFUL. File: `client/android/app/build/outputs/apk/debug/app-debug.apk`. Bản mới có versionName 1.1.0, versionCode 2. Cài cập nhật bản cũ nếu cùng chữ ký. Không gỡ bản cũ chỉ để tránh lỗi chữ ký mà chưa sao lưu dữ liệu cục bộ cần giữ.

## 5. Kiểm thử trên điện thoại

1. Mở APK → Đăng nhập bằng Google.
2. Trình duyệt hệ thống mở trang Google; chọn tài khoản.
3. Sau xác thực, app tự mở. Nếu chưa mở, bấm “Mở ứng dụng Quản lý thiết bị” tại trang callback.
4. Kiểm tra tài khoản đã đăng nhập và dữ liệu đúng API.
5. Thử hủy Google, đóng trình duyệt, thử lại, quay về app đang mở và app bị hệ điều hành đóng.
6. Đảm bảo website vẫn đăng nhập Google và tài khoản/mật khẩu như trước.

Đăng nhập Google trên Chrome ngoài luồng app không tự đăng nhập APK. Phiên khởi tạo tồn tại tối đa 10 phút; mã quay về app tồn tại 2 phút và chỉ dùng một lần.

## Lỗi thường gặp

- “Server chưa cập nhật”: backend chưa deploy mã mới, hoặc APK gọi API khác.
- “Server chưa cấu hình Google cho app”: thiếu một trong ba biến server.
- `redirect_uri_mismatch`: sửa Authorized redirect URIs trên đúng Web client, khớp GOOGLE_MOBILE_REDIRECT_URI.
- App không tự mở: dùng nút quay lại app trên trang callback và kiểm tra đã cài đúng APK mới.
- Phiên hết hạn: bấm Google trong app để bắt đầu lại; không tải lại callback cũ.
- Sai Client Secret: nhập secret của đúng Web client; không dùng Android Client ID.

## Phạm vi và an toàn

- Google auth code, Client Secret, access token và app JWT không được gắn vào đường dẫn quay về app.
- Đường dẫn chỉ mang mã ngẫu nhiên dùng một lần và state. Chỉ APK giữ verifier đúng mới đổi được mã.
- Server dùng thư viện Google xác minh chữ ký, audience, issuer, hạn token và nonce; Google giữ mật khẩu người dùng.
- Phần lưu phiên ngắn hạn hiện nằm trong bộ nhớ **một tiến trình server**, không thay schema Neon. Nếu server khởi động lại giữa lúc đăng nhập, người dùng phải thử lại. Khi chạy nhiều worker/instance cần chuyển kho phiên sang Redis hoặc kho TTL dùng chung; chưa bật mở rộng nhiều instance cho luồng này.
- Tăng độ tin cậy đường dẫn quay về bằng verified HTTPS App Links là bước triển khai tiếp theo. Custom scheme hiện được bảo vệ bằng proof S256 nhưng hệ điều hành vẫn có thể hỏi chọn app nếu có app khác cùng khai báo scheme.
- Kiểm thử mô phỏng không thay thế đăng nhập Google thật trên điện thoại và cấu hình Google Cloud/Render.

Nguồn: [Google OAuth Web Server](https://developers.google.com/identity/protocols/oauth2/web-server), [Capacitor Browser](https://capacitorjs.com/docs/apis/browser), [Capacitor App](https://capacitorjs.com/docs/apis/app).

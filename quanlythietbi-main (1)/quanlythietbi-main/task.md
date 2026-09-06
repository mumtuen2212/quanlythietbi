# Task List — Auth + RBAC + Leaflet Map + Camera Preview

## Backend
- [x] Cài packages: bcryptjs, jsonwebtoken
- [x] Cập nhật types.ts (User auth fields, Permission)
- [x] Cập nhật db.ts (hash passwords, user methods, permissions)
- [x] Tạo server/src/routes/auth.ts (register, login, me, grant-permission)
- [x] Cập nhật server/src/routes/api.ts (auth middleware, protected routes)
- [x] Cập nhật server/src/index.ts (mount /api/auth)
- [x] Server build (tsc) — ✅ no errors

## Frontend
- [x] Cài packages: react-leaflet, leaflet, @types/leaflet
- [x] Tạo client/src/context/AuthContext.tsx
- [x] Tạo client/src/pages/LoginPage.tsx
- [x] Tạo client/src/pages/RegisterPage.tsx
- [x] Cập nhật client/src/components/Navbar.tsx
- [x] Cập nhật client/src/App.tsx (AuthProvider + ProtectedRoute)
- [x] Tạo client/src/components/LeafletCampusMap.tsx
- [x] Cập nhật client/src/pages/HomePage.tsx (dùng LeafletCampusMap)
- [x] Cập nhật client/src/pages/ReportIncidentPage.tsx (Camera Capture)
- [x] Cập nhật client/src/pages/AdminDashboardPage.tsx (tab Cấp Quyền)
- [x] Client build (tsc + vite) — ✅ 1803 modules, exit code 0

## Verify
- [x] Build client không lỗi ✅
- [ ] Test đăng ký / đăng nhập
- [ ] Test phân quyền
- [ ] Test camera capture
- [ ] Test bản đồ Leaflet

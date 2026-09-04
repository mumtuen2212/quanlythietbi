# Task List — Auth + RBAC + Leaflet Map + Camera Preview

## Backend
- [/] Cài packages: bcryptjs, jsonwebtoken
- [ ] Cập nhật types.ts (User auth fields, Permission)
- [ ] Cập nhật db.ts (hash passwords, user methods, permissions)
- [ ] Tạo server/src/routes/auth.ts (register, login, me, grant-permission)
- [ ] Cập nhật server/src/routes/api.ts (auth middleware, protected routes)
- [ ] Cập nhật server/src/index.ts (mount /api/auth)

## Frontend
- [ ] Cài packages: react-leaflet, leaflet, @types/leaflet
- [ ] Tạo client/src/context/AuthContext.tsx
- [ ] Tạo client/src/pages/LoginPage.tsx
- [ ] Tạo client/src/pages/RegisterPage.tsx
- [ ] Cập nhật client/src/components/Navbar.tsx
- [ ] Cập nhật client/src/App.tsx (AuthProvider + ProtectedRoute)
- [ ] Tạo client/src/components/LeafletCampusMap.tsx
- [ ] Cập nhật client/src/pages/HomePage.tsx (dùng LeafletCampusMap)
- [ ] Cập nhật client/src/pages/ReportIncidentPage.tsx (Camera Capture)
- [ ] Cập nhật client/src/pages/AdminDashboardPage.tsx (tab Cấp Quyền)

## Verify
- [ ] Build client không lỗi
- [ ] Test đăng ký / đăng nhập
- [ ] Test phân quyền
- [ ] Test camera capture
- [ ] Test bản đồ Leaflet

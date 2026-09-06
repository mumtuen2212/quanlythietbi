"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requirePermission = exports.optionalAuth = exports.authenticateToken = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../data/db");
const types_1 = require("../data/types");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'tdmu-equipment-management-jwt-secret-2026';
// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = db_1.Database.getUserById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc phiên đã hết hạn' });
        }
        req.user = user;
        next();
    }
    catch (err) {
        return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};
exports.authenticateToken = authenticateToken;
// Optional Authentication Middleware (doesn't reject if not authenticated)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = db_1.Database.getUserById(decoded.id);
            if (user) {
                req.user = user;
            }
        }
        catch {
            // Ignore invalid token for optional auth
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
// Permission Guard Middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }
        if (req.user.role_name === 'ADMIN' || (req.user.permissions && req.user.permissions.includes(permission))) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Bạn không có quyền thực hiện hành động này (Cần quyền: ${permission})`
        });
    };
};
exports.requirePermission = requirePermission;
// Role Guard Middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }
        if (roles.includes(req.user.role_name) || req.user.role_name === 'ADMIN') {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Hành động này chỉ dành cho vai trò: ${roles.join(', ')}`
        });
    };
};
exports.requireRole = requireRole;
// ================= AUTH ROUTES =================
// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password, full_name, email, phone, role_name } = req.body;
        if (!username || !password || !full_name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ: Tên đăng nhập, Mật khẩu, Họ tên và Email'
            });
        }
        if (username.length < 3) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        if (db_1.Database.getUserByUsername(username)) {
            return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trong hệ thống' });
        }
        if (db_1.Database.getUserByEmail(email)) {
            return res.status(400).json({ success: false, message: 'Email này đã được đăng ký' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const password_hash = await bcryptjs_1.default.hash(password, salt);
        // Default registered users to STUDENT or TEACHER
        const role = (role_name && ['TEACHER', 'STUDENT'].includes(role_name))
            ? role_name
            : 'STUDENT';
        const newUser = db_1.Database.createUser({
            username,
            password_hash,
            full_name,
            email,
            phone: phone || '',
            role_name: role
        });
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, username: newUser.username, role: newUser.role_name }, JWT_SECRET, { expiresIn: '7d' });
        const { password_hash: _, ...safeUser } = newUser;
        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công!',
            data: {
                token,
                user: safeUser
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu'
            });
        }
        // Lookup user by username or email
        const user = db_1.Database.getUserByUsername(username) || db_1.Database.getUserByEmail(username);
        if (!user || !user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác'
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không chính xác'
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role_name }, JWT_SECRET, { expiresIn: '7d' });
        const { password_hash: _, ...safeUser } = user;
        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                token,
                user: safeUser
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Current User Profile & Permissions
router.get('/me', exports.authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    const { password_hash: _, ...safeUser } = req.user;
    res.json({
        success: true,
        data: safeUser
    });
});
// List Users for RBAC Management (Requires GRANT_PERMISSIONS or ADMIN)
router.get('/users', exports.authenticateToken, (0, exports.requirePermission)('GRANT_PERMISSIONS'), (req, res) => {
    const users = db_1.Database.getUsers();
    res.json({
        success: true,
        data: users
    });
});
// Create a managed account, primarily for technicians.
router.post('/users', exports.authenticateToken, (0, exports.requirePermission)('GRANT_PERMISSIONS'), async (req, res) => {
    try {
        const { username, password, full_name, email, phone, role_name = 'TECHNICIAN', permissions } = req.body;
        const validRoles = ['ADMIN', 'TECHNICIAN', 'TEACHER', 'STUDENT'];
        if (!username || !password || !full_name || !email) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền tên đăng nhập, mật khẩu, họ tên và email' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        }
        if (!validRoles.includes(role_name)) {
            return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
        }
        if (role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Chỉ Admin mới được tạo tài khoản Admin' });
        }
        if (db_1.Database.getUserByUsername(username) || db_1.Database.getUserByEmail(email)) {
            return res.status(409).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại' });
        }
        const password_hash = await bcryptjs_1.default.hash(password, 10);
        const newUser = db_1.Database.createUser({
            username,
            password_hash,
            full_name,
            email,
            phone,
            role_name,
            permissions: Array.isArray(permissions) ? permissions.filter((p) => types_1.ALL_PERMISSIONS.includes(p)) : undefined
        });
        const { password_hash: _, ...safeUser } = newUser;
        return res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: safeUser });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
// Update account details. Permission changes remain handled by the RBAC endpoint below.
router.patch('/users/:id', exports.authenticateToken, (0, exports.requirePermission)('GRANT_PERMISSIONS'), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { full_name, email, phone, password, role_name } = req.body;
        const user = db_1.Database.getUserById(userId);
        const validRoles = ['ADMIN', 'TECHNICIAN', 'TEACHER', 'STUDENT'];
        if (!user)
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        if (role_name && !validRoles.includes(role_name))
            return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
        if (role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Chỉ Admin mới được chuyển tài khoản sang Admin' });
        }
        if (password !== undefined && password.length < 6)
            return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
        if (email && db_1.Database.getUserByEmail(email) && db_1.Database.getUserByEmail(email)?.id !== userId) {
            return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
        }
        const updated = db_1.Database.updateUser(userId, {
            full_name,
            email,
            phone,
            role_name,
            password_hash: password ? await bcryptjs_1.default.hash(password, 10) : undefined
        });
        const { password_hash: _, ...safeUser } = updated;
        return res.json({ success: true, message: 'Cập nhật tài khoản thành công', data: safeUser });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
router.delete('/users/:id', exports.authenticateToken, (0, exports.requirePermission)('GRANT_PERMISSIONS'), (req, res) => {
    const userId = parseInt(req.params.id);
    if (req.user?.id === userId)
        return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản đang đăng nhập' });
    const target = db_1.Database.getUserById(userId);
    if (!target)
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (target.role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Chỉ Admin mới được xóa tài khoản Admin' });
    }
    if (target.role_name === 'ADMIN' && db_1.Database.getUsers().filter(u => u.role_name === 'ADMIN').length <= 1) {
        return res.status(400).json({ success: false, message: 'Không thể xóa quản trị viên cuối cùng' });
    }
    db_1.Database.deleteUser(userId);
    return res.json({ success: true, message: 'Đã xóa tài khoản' });
});
// Update User Permissions (RBAC)
router.patch('/users/:id/permissions', exports.authenticateToken, (0, exports.requirePermission)('GRANT_PERMISSIONS'), (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { permissions, role_name } = req.body;
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, message: 'Danh sách quyền (permissions) phải là một mảng' });
        }
        if (role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Chỉ Admin mới được cấp vai trò Admin' });
        }
        // Validate permission names
        const validPermissions = permissions.filter((p) => types_1.ALL_PERMISSIONS.includes(p));
        if (role_name) {
            const updated = db_1.Database.updateUserRole(userId, role_name, validPermissions);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
            }
            const { password_hash: _, ...safeUser } = updated;
            return res.json({ success: true, message: 'Cập nhật vai trò và quyền thành công!', data: safeUser });
        }
        const updated = db_1.Database.updateUserPermissions(userId, validPermissions);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
        const { password_hash: _, ...safeUser } = updated;
        res.json({
            success: true,
            message: 'Cập nhật phân quyền thành công!',
            data: safeUser
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.default = router;

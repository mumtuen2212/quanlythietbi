import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../data/db';
import { User, Permission, RoleName, ALL_PERMISSIONS } from '../data/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tdmu-equipment-management-jwt-secret-2026';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    const user = Database.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc phiên đã hết hạn' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Optional Authentication Middleware (doesn't reject if not authenticated)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
      const user = Database.getUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
};

// Permission Guard Middleware
export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Role Guard Middleware
export const requireRole = (roles: RoleName[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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

// ================= AUTH ROUTES =================

// Register
router.post('/register', async (req: Request, res: Response) => {
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

    if (Database.getUserByUsername(username)) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trong hệ thống' });
    }

    if (Database.getUserByEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Default registered users to STUDENT or TEACHER
    const role: RoleName = (role_name && ['TEACHER', 'STUDENT'].includes(role_name))
      ? role_name
      : 'STUDENT';

    const newUser = Database.createUser({
      username,
      password_hash,
      full_name,
      email,
      phone: phone || '',
      role_name: role
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        token,
        user: safeUser
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập/email và mật khẩu'
      });
    }

    // Lookup user by username or email
    const user = Database.getUserByUsername(username) || Database.getUserByEmail(username);
    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        token,
        user: safeUser
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Current User Profile & Permissions
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
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
router.get('/users', authenticateToken, requirePermission('GRANT_PERMISSIONS'), (req: AuthRequest, res: Response) => {
  const users = Database.getUsers();
  res.json({
    success: true,
    data: users
  });
});

// Create a managed account, primarily for technicians.
router.post('/users', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, full_name, email, phone, role_name = 'TECHNICIAN', permissions } = req.body;
    const validRoles: RoleName[] = ['ADMIN', 'TECHNICIAN', 'TEACHER', 'STUDENT'];

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
    if (Database.getUserByUsername(username) || Database.getUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = Database.createUser({
      username,
      password_hash,
      full_name,
      email,
      phone,
      role_name,
      permissions: Array.isArray(permissions) ? permissions.filter((p: any): p is Permission => ALL_PERMISSIONS.includes(p)) : undefined
    });
    const { password_hash: _, ...safeUser } = newUser;
    return res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update account details. Permission changes remain handled by the RBAC endpoint below.
router.patch('/users/:id', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { full_name, email, phone, password, role_name } = req.body;
    const user = Database.getUserById(userId);
    const validRoles: RoleName[] = ['ADMIN', 'TECHNICIAN', 'TEACHER', 'STUDENT'];

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (role_name && !validRoles.includes(role_name)) return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
    if (role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới được chuyển tài khoản sang Admin' });
    }
    if (password !== undefined && password.length < 6) return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    if (email && Database.getUserByEmail(email) && Database.getUserByEmail(email)?.id !== userId) {
      return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    }

    const updated = Database.updateUser(userId, {
      full_name,
      email,
      phone,
      role_name,
      password_hash: password ? await bcrypt.hash(password, 10) : undefined
    });
    const { password_hash: _, ...safeUser } = updated!;
    return res.json({ success: true, message: 'Cập nhật tài khoản thành công', data: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', authenticateToken, requirePermission('GRANT_PERMISSIONS'), (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);
  if (req.user?.id === userId) return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản đang đăng nhập' });
  const target = Database.getUserById(userId);
  if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
  if (target.role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Chỉ Admin mới được xóa tài khoản Admin' });
  }
  if (target.role_name === 'ADMIN' && Database.getUsers().filter(u => u.role_name === 'ADMIN').length <= 1) {
    return res.status(400).json({ success: false, message: 'Không thể xóa quản trị viên cuối cùng' });
  }
  Database.deleteUser(userId);
  return res.json({ success: true, message: 'Đã xóa tài khoản' });
});

// Update User Permissions (RBAC)
router.patch('/users/:id/permissions', authenticateToken, requirePermission('GRANT_PERMISSIONS'), (req: AuthRequest, res: Response) => {
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
    const validPermissions = permissions.filter((p: any): p is Permission => ALL_PERMISSIONS.includes(p));

    if (role_name) {
      const updated = Database.updateUserRole(userId, role_name, validPermissions);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      const { password_hash: _, ...safeUser } = updated;
      return res.json({ success: true, message: 'Cập nhật vai trò và quyền thành công!', data: safeUser });
    }

    const updated = Database.updateUserPermissions(userId, validPermissions);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const { password_hash: _, ...safeUser } = updated;
    res.json({
      success: true,
      message: 'Cập nhật phân quyền thành công!',
      data: safeUser
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

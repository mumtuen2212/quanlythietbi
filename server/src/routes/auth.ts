import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../data/db';
import { SqlDatabase } from '../data/sqlDb';
import { User, Permission, RoleName, ALL_PERMISSIONS } from '../data/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tdmu-equipment-management-jwt-secret-2026';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    let user: User | null = null;
    try {
      user = await SqlDatabase.getUserById(decoded.id);
    } catch {
      user = Database.getUserById(decoded.id);
    }
    if (!user) {
      user = Database.getUserById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc phiên đã hết hạn' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Optional Authentication Middleware
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
      let user: User | null = null;
      try {
        user = await SqlDatabase.getUserById(decoded.id);
      } catch {
        user = Database.getUserById(decoded.id);
      }
      if (!user) {
        user = Database.getUserById(decoded.id);
      }
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

    let existingUser = null;
    try {
      existingUser = await SqlDatabase.getUserByUsername(username);
    } catch {
      existingUser = Database.getUserByUsername(username);
    }
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trong hệ thống' });
    }

    let existingEmailUser = null;
    try {
      existingEmailUser = await SqlDatabase.getUserByEmail(email);
    } catch {
      existingEmailUser = Database.getUserByEmail(email);
    }
    if (existingEmailUser) {
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const role: RoleName = (role_name && ['TEACHER', 'STUDENT'].includes(role_name))
      ? role_name
      : 'STUDENT';

    let newUser: User | null = null;
    try {
      newUser = await SqlDatabase.createUser({
        username,
        password_hash,
        full_name,
        email,
        phone: phone || '',
        role_name: role
      });
    } catch {
      newUser = Database.createUser({
        username,
        password_hash,
        full_name,
        email,
        phone: phone || '',
        role_name: role
      });
    }

    if (!newUser) {
      newUser = Database.createUser({
        username,
        password_hash,
        full_name,
        email,
        phone: phone || '',
        role_name: role
      });
    }

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

    let user: User | null = null;
    try {
      user = (await SqlDatabase.getUserByUsername(username)) || (await SqlDatabase.getUserByEmail(username));
    } catch (e) {
      console.warn('SQL login lookup fallback:', e);
    }

    if (!user) {
      user = Database.getUserByUsername(username) || Database.getUserByEmail(username);
    }

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

// List Users for RBAC Management
router.get('/users', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await SqlDatabase.getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    const users = Database.getUsers();
    res.json({ success: true, data: users });
  }
});

// Create a managed account
router.post('/users', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, full_name, email, phone, role_name = 'TECHNICIAN' } = req.body;
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

    const password_hash = await bcrypt.hash(password, 10);
    let newUser: User | null = null;
    try {
      newUser = await SqlDatabase.createUser({
        username,
        password_hash,
        full_name,
        email,
        phone,
        role_name
      });
    } catch {
      newUser = Database.createUser({
        username,
        password_hash,
        full_name,
        email,
        phone,
        role_name
      });
    }

    const { password_hash: _, ...safeUser } = newUser!;
    return res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);
  if (req.user?.id === userId) return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản đang đăng nhập' });

  try {
    await SqlDatabase.deleteUser(userId);
  } catch {
    Database.deleteUser(userId);
  }
  return res.json({ success: true, message: 'Đã xóa tài khoản' });
});

// Update User Role & Permissions (RBAC)
router.patch('/users/:id/permissions', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role_name } = req.body;

    if (role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới được cấp vai trò Admin' });
    }

    let updated: User | null = null;
    if (role_name) {
      try {
        updated = await SqlDatabase.updateUserRole(userId, role_name);
      } catch {
        updated = Database.updateUserRole(userId, role_name);
      }
    }

    if (!updated) {
      updated = Database.getUserById(userId);
    }

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

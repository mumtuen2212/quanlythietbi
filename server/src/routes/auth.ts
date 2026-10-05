import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PostgresDatabase } from '../data/postgresDb';
import { User, Permission, RoleName } from '../data/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in the Render environment.');
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

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
    const user = await PostgresDatabase.getUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc phiên đã hết hạn' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof Error && !(err instanceof jwt.JsonWebTokenError) && !(err instanceof jwt.TokenExpiredError)) {
      return res.status(503).json({ success: false, message: 'Không thể xác thực tài khoản do lỗi cơ sở dữ liệu' });
    }
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
      const user = await PostgresDatabase.getUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      if (!(error instanceof jwt.JsonWebTokenError) && !(error instanceof jwt.TokenExpiredError)) {
        return next(error);
      }
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

    const existingUser = await PostgresDatabase.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trong hệ thống' });
    }

    const existingEmailUser = await PostgresDatabase.getUserByEmail(email);
    if (existingEmailUser) {
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const role: RoleName = (role_name && ['TEACHER', 'STUDENT'].includes(role_name))
      ? role_name
      : 'STUDENT';

    const newUser = await PostgresDatabase.createUser({
      username,
      password_hash,
      full_name,
      email,
      phone: phone || '',
      role_name: role
    });
    if (!newUser) throw new Error('PostgreSQL did not return the newly created account.');

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
      user = (await PostgresDatabase.getUserByUsername(username)) || (await PostgresDatabase.getUserByEmail(username));
    } catch (e) {
      console.error('PostgreSQL login lookup failed:', e);
      return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại.' });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc email không chính xác'
      });
    }

    const isMatch = user.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác'
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

router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { current_password, new_password, confirm_password } = req.body;
  if (!current_password || !new_password || !confirm_password) return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin mật khẩu' });
  if (new_password.length < 6) return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  if (new_password !== confirm_password) return res.status(400).json({ success: false, message: 'Hai lần nhập mật khẩu mới không trùng nhau' });
  try {
    const user = await PostgresDatabase.getUserById(req.user!.id);
    if (!user?.password_hash || !await bcrypt.compare(current_password, user.password_hash)) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    const changed = await PostgresDatabase.updateOwnPassword(user.id, await bcrypt.hash(new_password, 12));
    if (!changed) return res.status(500).json({ success: false, message: 'Không thể đổi mật khẩu' });
    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error: any) { return res.status(500).json({ success: false, message: error.message || 'Không thể đổi mật khẩu' }); }
});

// Google Identity Services returns an ID token to the browser. The token is
// verified with Google's token endpoint before this API creates its own JWT.
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, message: 'Đăng nhập Google chưa được cấu hình trên máy chủ' });
    }
    if (typeof credential !== 'string' || !credential.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu mã xác thực Google' });
    }

    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!googleResponse.ok) {
      return res.status(401).json({ success: false, message: 'Mã xác thực Google không hợp lệ hoặc đã hết hạn' });
    }

    const claims = await googleResponse.json() as {
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      exp?: string;
      iss?: string;
      name?: string;
      sub?: string;
    };
    const isVerifiedEmail = claims.email_verified === true || claims.email_verified === 'true';
    const isGoogleIssuer = claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com';
    const isExpired = !claims.exp || Number(claims.exp) * 1000 <= Date.now();

    if (
      claims.aud !== GOOGLE_CLIENT_ID || !claims.email || !claims.sub ||
      !isVerifiedEmail || !isGoogleIssuer || isExpired
    ) {
      return res.status(401).json({ success: false, message: 'Thông tin xác thực Google không hợp lệ' });
    }

    let user: User | null = null;
    try {
      user = await PostgresDatabase.getUserByEmail(claims.email);
    } catch (error) {
      console.error('PostgreSQL Google login lookup failed:', error);
      return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại.' });
    }

    if (!user) {
      const payload = {
        username: `google_${claims.sub}`,
        password_hash: await bcrypt.hash(`google:${claims.sub}:${Date.now()}`, 12),
        full_name: (claims.name || claims.email.split('@')[0]).slice(0, 150),
        email: claims.email,
        phone: '',
        role_name: 'STUDENT' as RoleName
      };
      user = await PostgresDatabase.createUser(payload);
      if (!user) throw new Error('PostgreSQL did not return the Google account.');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password_hash: _, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      data: { token, user: safeUser }
    });
  } catch (err: any) {
    console.error('Google login failed:', err);
    return res.status(500).json({ success: false, message: 'Không thể xác thực đăng nhập Google' });
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
    const users = await PostgresDatabase.getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('PostgreSQL user listing failed:', err);
    res.status(503).json({ success: false, message: 'Không thể tải danh sách tài khoản' });
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
    const newUser = await PostgresDatabase.createUser({
      username,
      password_hash,
      full_name,
      email,
      phone,
      role_name
    });
    if (!newUser) throw new Error('PostgreSQL did not return the new account.');

    const { password_hash: _, ...safeUser } = newUser!;
    return res.status(201).json({ success: true, message: 'Tạo tài khoản thành công', data: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
  }
  if (req.user?.id === userId) return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản đang đăng nhập' });

  try {
    const deleted = await PostgresDatabase.deleteUser(userId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại hoặc là tài khoản hệ thống' });
    return res.json({ success: true, message: 'Đã xóa tài khoản' });
  } catch (error: any) {
    console.error(`[DELETE /auth/users/${userId}] PostgreSQL deletion failed:`, error);
    return res.status(500).json({ success: false, message: 'Không thể xóa tài khoản trong cơ sở dữ liệu chính' });
  }
});

// Update User Role & Permissions (RBAC)
router.patch('/users/:id/permissions', authenticateToken, requirePermission('GRANT_PERMISSIONS'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role_name } = req.body;

    if (role_name === 'ADMIN' && req.user?.role_name !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới được cấp vai trò Admin' });
    }

    const updated = role_name ? await PostgresDatabase.updateUserRole(userId, role_name) : null;

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

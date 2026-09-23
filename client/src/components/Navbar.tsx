import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, 
  QrCode, 
  BookOpen, 
  AlertTriangle, 
  Settings, 
  School,
  MapPin,
  ShieldCheck,
  UserCheck,
  LogIn,
  LogOut,
  User as UserIcon,
  KeyRound,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';

interface NavbarProps {
  isTechnicianMode?: boolean;
  onToggleTechnicianMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isTechnicianMode = false,
  onToggleTechnicianMode
}) => {
  const location = useLocation();
  const { user, isAuthenticated, logout, hasPermission } = useAuth();
  const canAccessAdmin = Boolean(user && (user.role_name === 'ADMIN' || hasPermission('MANAGE_ROOMS')));
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setPasswordMessage('Hai lần nhập mật khẩu mới không trùng nhau.'); return; }
    try {
      setChangingPassword(true); setPasswordMessage(null);
      setPasswordMessage(await ApiService.changePassword(currentPassword, newPassword, confirmPassword));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) { setPasswordMessage(error.response?.data?.message || 'Không thể đổi mật khẩu.'); }
    finally { setChangingPassword(false); }
  };

  const navItems = [
    { path: '/', label: 'Bản đồ & Sơ đồ Tầng', icon: MapPin },
    { path: '/qr-scanner', label: 'Quét mã QR', icon: QrCode },
    { path: '/manuals', label: 'Hướng dẫn sử dụng', icon: BookOpen },
    { path: '/report-incident', label: 'Báo hỏng thiết bị', icon: AlertTriangle }
  ];

  if (canAccessAdmin) {
    navItems.push({ path: '/admin', label: 'Quản trị & KTV', icon: Settings });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 leading-tight text-base sm:text-lg">
                <span>TDMU Campus</span>
                <span className="text-sky-600 text-xs px-1.5 py-0.5 rounded bg-sky-50 font-semibold border border-sky-200">Bản Đồ & CSVC</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Sơ đồ khuôn viên & Quản lý thiết bị</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Auth Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-none">{user.full_name || user.username}</span>
                  <span className="text-[10px] font-semibold text-sky-600 mt-0.5">
                    {user.role_name === 'ADMIN' ? 'Quản Trị Viên' : user.role_name === 'TECHNICIAN' ? 'Kỹ Thuật Viên' : user.role_name === 'TEACHER' ? 'Giảng Viên' : 'Sinh Viên'}
                  </span>
                </div>

                <button onClick={() => setShowProfile(true)} title="Thông tin người dùng" className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:scale-105 transition-transform">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </button>

                <button
                  onClick={logout}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thoát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm shadow-sky-600/25"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng Nhập</span>
                </Link>
              </div>
            )}

            <Link
              to="/qr-scanner"
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>QR</span>
            </Link>
          </div>
        </div>
      </div>

      {showProfile && user && createPortal(<div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 pt-24 pb-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-black text-slate-900">Thông tin người dùng</h2><p className="mt-1 text-xs text-slate-500">Tài khoản đang đăng nhập</p></div><button onClick={() => setShowProfile(false)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button></div>
          <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-lg font-black text-white">{user.full_name?.charAt(0).toUpperCase() || 'U'}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{user.full_name || user.username}</p><p className="truncate text-xs text-slate-500">@{user.username}</p></div></div>
          <dl className="my-4 space-y-3 text-sm"><div><dt className="text-[11px] font-bold uppercase text-slate-400">Email</dt><dd className="mt-0.5 text-slate-700">{user.email || 'Chưa cập nhật'}</dd></div><div><dt className="text-[11px] font-bold uppercase text-slate-400">Vai trò</dt><dd className="mt-0.5 text-slate-700">{user.role_name}</dd></div><div><dt className="text-[11px] font-bold uppercase text-slate-400">Số điện thoại</dt><dd className="mt-0.5 text-slate-700">{user.phone || 'Chưa cập nhật'}</dd></div></dl>
          <button onClick={() => { setShowProfile(false); setShowPasswordForm(true); setPasswordMessage(null); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700"><KeyRound className="w-4 h-4" />Đổi mật khẩu</button>
        </div>
      </div>, document.body)}

      {showPasswordForm && createPortal(<div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 pt-24 pb-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-black text-slate-900">Đổi mật khẩu</h2><p className="mt-1 text-xs text-slate-500">Nhập mật khẩu hiện tại và xác nhận mật khẩu mới.</p></div><button onClick={() => setShowPasswordForm(false)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button></div>
          {passwordMessage && <p className="mb-4 rounded-xl bg-sky-50 p-3 text-xs font-medium text-sky-700">{passwordMessage}</p>}
          <form onSubmit={submitPasswordChange} className="space-y-3">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mật khẩu mới (ít nhất 6 ký tự)" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="password" minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <button disabled={changingPassword} className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{changingPassword ? 'Đang lưu...' : 'Đổi mật khẩu'}</button>
          </form>
        </div>
      </div>, document.body)}

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-2 flex justify-around shadow-lg safe-area-bottom">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-sky-50' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="truncate max-w-[65px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};

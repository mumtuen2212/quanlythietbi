import React from 'react';
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
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  isTechnicianMode?: boolean;
  onToggleTechnicianMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isTechnicianMode = false,
  onToggleTechnicianMode
}) => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Bản đồ & Sơ đồ Tầng', icon: MapPin },
    { path: '/qr-scanner', label: 'Quét mã QR', icon: QrCode, highlight: true },
    { path: '/manuals', label: 'Hướng dẫn sử dụng', icon: BookOpen },
    { path: '/report-incident', label: 'Báo hỏng thiết bị', icon: AlertTriangle },
    { path: '/admin', label: 'Quản trị & KTV', icon: Settings }
  ];

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
                    item.highlight
                      ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/30'
                      : isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-white' : isActive ? 'text-sky-600' : 'text-slate-400'}`} />
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

                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>

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
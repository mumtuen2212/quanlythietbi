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
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  isTechnicianMode?: boolean;
  onToggleTechnicianMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isTechnicianMode = false,
  onToggleTechnicianMode
}) => {
  const location = useLocation();

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
          <nav className="hidden md:flex items-center gap-1">
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

          {/* Role Switcher Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleTechnicianMode && (
              <button
                onClick={onToggleTechnicianMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                  isTechnicianMode
                    ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Chuyển đổi giao diện Sinh viên / Kỹ thuật viên"
              >
                {isTechnicianMode ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span className="hidden sm:inline">Chế độ: Kỹ thuật viên</span>
                    <span className="sm:hidden">KTV</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    <span className="hidden sm:inline">Chế độ: Sinh viên</span>
                    <span className="sm:hidden">Học sinh</span>
                  </>
                )}
              </button>
            )}

            <Link
              to="/qr-scanner"
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>Quét QR</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-3 py-2 flex justify-around shadow-lg">
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
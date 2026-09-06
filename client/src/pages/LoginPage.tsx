import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogIn, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  School,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ username: username.trim(), password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25 mb-4">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng Nhập Hệ Thống</h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống Quản lý Thiết bị & Sơ đồ TDMU Campus</p>
        </div>

        {/* Demo Quick Accounts */}
        <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Tài khoản Demo thử nghiệm nhanh:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="px-2.5 py-1.5 text-left rounded-xl bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-xs"
            >
              <div className="font-bold text-slate-900">Quản trị viên (Admin)</div>
              <div className="text-[11px] text-slate-500">admin / admin123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('technician', 'tech123')}
              className="px-2.5 py-1.5 text-left rounded-xl bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-xs"
            >
              <div className="font-bold text-slate-900">Kỹ thuật viên (KTV)</div>
              <div className="text-[11px] text-slate-500">technician / tech123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('teacher', 'teacher123')}
              className="px-2.5 py-1.5 text-left rounded-xl bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-xs"
            >
              <div className="font-bold text-slate-900">Giảng viên</div>
              <div className="text-[11px] text-slate-500">teacher / teacher123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('student', 'student123')}
              className="px-2.5 py-1.5 text-left rounded-xl bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all text-xs"
            >
              <div className="font-bold text-slate-900">Sinh viên</div>
              <div className="text-[11px] text-slate-500">student / student123</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên đăng nhập hoặc Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ví dụ: admin, technician, teacher..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-bold text-sky-600 hover:text-sky-700 transition-colors">
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
};

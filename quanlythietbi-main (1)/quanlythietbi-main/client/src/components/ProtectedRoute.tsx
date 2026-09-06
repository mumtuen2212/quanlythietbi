import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Permission, RoleName } from '../types';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredPermission?: Permission;
  requiredRoles?: RoleName[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRoles
}) => {
  const { user, isAuthenticated, isLoading, hasPermission, hasAnyRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Tài khoản của bạn ({user?.role_name}) chưa được cấp quyền <code>{requiredPermission}</code> để xem trang này.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
        >
          Quay lại trang trước
        </button>
      </div>
    );
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Yêu Cầu Quyền Quản Trị / KTV</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Trang này chỉ dành cho vai trò: {requiredRoles.join(', ')}.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
        >
          Quay lại trang trước
        </button>
      </div>
    );
  }

  return children;
};

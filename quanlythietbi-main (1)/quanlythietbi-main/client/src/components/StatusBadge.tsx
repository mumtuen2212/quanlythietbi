import React from 'react';

interface StatusBadgeProps {
  status: 'ACTIVE' | 'DAMAGED' | 'UNDER_MAINTENANCE' | 'MAINTENANCE' | 'CLOSED' | 'LIQUIDATED' | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Hoạt động tốt', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
      case 'DAMAGED':
        return { label: 'Đang báo hỏng', bg: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse', dot: 'bg-rose-500' };
      case 'UNDER_MAINTENANCE':
      case 'MAINTENANCE':
        return { label: 'Đang bảo dưỡng', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      case 'CLOSED':
        return { label: 'Tạm đóng', bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' };
      case 'PENDING':
        return { label: 'Chờ tiếp nhận', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
      case 'ASSIGNED':
        return { label: 'Đã giao KTV', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
      case 'IN_PROGRESS':
        return { label: 'Đang sửa chữa', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
      case 'RESOLVED':
        return { label: 'Đã khắc phục', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
      case 'CANCELLED':
        return { label: 'Đã hủy', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const config = getBadgeConfig();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${padding} ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

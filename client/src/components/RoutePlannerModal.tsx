import React, { useEffect, useState } from 'react';
import { Navigation, X } from 'lucide-react';
import { findWalkingRoute, RouteLocation } from '../services/campusRouting';
import type { RouteResult } from '../services/pathfinding';

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRoute: (route: RouteResult) => void;
  locations: RouteLocation[];
  initialToId?: string;
  initialRoute?: RouteResult | null;
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen, onClose, onApplyRoute, locations, initialToId, initialRoute
}) => {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [error, setError] = useState('');
  const signature = locations.map(l => l.id).join(',');
  useEffect(() => {
    if (!isOpen) return;
    setFromId(locations.find(l => l.name === initialRoute?.fromName)?.id || locations[0]?.id || '');
    setToId(initialToId || locations.find(l => l.name === initialRoute?.toName)?.id || locations[1]?.id || '');
    setRoute(initialRoute || null);
    setError('');
  }, [isOpen, initialToId, initialRoute, signature]);
  if (!isOpen) return null;
  const calculate = () => {
    const from = locations.find(l => l.id === fromId), to = locations.find(l => l.id === toId);
    setRoute(null); setError('');
    if (!from || !to) { setError('Hãy chọn điểm xuất phát và điểm đến có tọa độ.'); return; }
    try { setRoute(findWalkingRoute(from, to)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tìm được tuyến đi bộ.'); }
  };
  return <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="route-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between"><h2 id="route-title" className="flex items-center gap-2 text-lg font-extrabold"><Navigation className="text-sky-600" />Chỉ đường đi bộ trong trường</h2><button type="button" aria-label="Đóng chỉ đường" onClick={onClose}><X /></button></div>
      <p className="text-xs text-slate-500">Chọn cổng, vị trí hiện tại hoặc phòng đã có tọa độ. Đường đi hiển thị ngay trên website.</p>
      <label className="block text-sm font-semibold">Điểm xuất phát<select value={fromId} onChange={e => { setFromId(e.target.value); setRoute(null); }} className="mt-2 w-full rounded-xl border p-3"><option value="">-- Chọn điểm xuất phát --</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <label className="block text-sm font-semibold">Điểm đến<select value={toId} onChange={e => { setToId(e.target.value); setRoute(null); }} className="mt-2 w-full rounded-xl border p-3"><option value="">-- Chọn điểm đến --</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      {locations.length === 0 && <p className="text-sm text-amber-700">Chưa tải được địa điểm. Hãy kiểm tra kết nối server.</p>}
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      <button type="button" onClick={calculate} disabled={!fromId || !toId} className="rounded-xl bg-slate-100 px-4 py-2 font-bold disabled:opacity-50">Tìm tuyến đi bộ</button>
      {route && <div className="rounded-2xl bg-sky-50 p-4 space-y-3"><p className="font-bold text-sky-800">{route.totalDistanceMeters}m · khoảng {route.estimatedMinutes} phút</p><ol className="space-y-2">{route.steps.map((step, i) => <li className="text-sm" key={i}>{i + 1}. {step.instruction}</li>)}</ol><p className="text-xs text-slate-500">{route.notice}</p></div>}
      <button type="button" disabled={!route} onClick={() => { if (route) { onApplyRoute(route); onClose(); } }} className="w-full rounded-xl bg-sky-600 py-3 font-bold text-white disabled:opacity-50">Vẽ đường đi trên bản đồ</button>
    </section>
  </div>;
};

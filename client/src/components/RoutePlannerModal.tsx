import React, { useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  ArrowRight, 
  ArrowUpDown, 
  Footprints, 
  Clock, 
  Sparkles, 
  X,
  Building2,
  DoorOpen,
  ArrowRightLeft
} from 'lucide-react';
import { CAMPUS_LOCATIONS, PathfindingService, RouteResult } from '../services/pathfinding';

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRoute: (route: RouteResult) => void;
  initialFromId?: string;
  initialToId?: string;
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen,
  onClose,
  onApplyRoute,
  initialFromId = 'POI-GATE-1',
  initialToId = 'ROOM-1'
}) => {
  const [fromId, setFromId] = useState(initialFromId);
  const [toId, setToId] = useState(initialToId);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(() => 
    PathfindingService.findRoute(initialFromId, initialToId)
  );

  if (!isOpen) return null;

  const handleCalculate = () => {
    const res = PathfindingService.findRoute(fromId, toId);
    setRouteResult(res);
  };

  const handleSwap = () => {
    const temp = fromId;
    setFromId(toId);
    setToId(temp);
    const res = PathfindingService.findRoute(toId, temp);
    setRouteResult(res);
  };

  const handleApply = () => {
    if (routeResult) {
      onApplyRoute(routeResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Tìm Đường Đi Trong Trường</h3>
              <p className="text-xs text-slate-500">Chỉ đường chi tiết từ cổng tới tận cửa phòng học</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Selectors */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative">
          {/* Origin */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Điểm xuất phát (Từ đâu?)</span>
            </label>
            <select
              value={fromId}
              onChange={e => {
                setFromId(e.target.value);
                const res = PathfindingService.findRoute(e.target.value, toId);
                setRouteResult(res);
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
            >
              {CAMPUS_LOCATIONS.map(loc => (
                <option key={loc.id} value={loc.id}>
                  [{loc.category}] {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <div className="flex justify-center -my-1">
            <button
              onClick={handleSwap}
              className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm transition-all"
              title="Đổi chiều đi"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Điểm đến (Đến đâu?)</span>
            </label>
            <select
              value={toId}
              onChange={e => {
                setToId(e.target.value);
                const res = PathfindingService.findRoute(fromId, e.target.value);
                setRouteResult(res);
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
            >
              {CAMPUS_LOCATIONS.map(loc => (
                <option key={loc.id} value={loc.id}>
                  [{loc.category}] {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Route Summary & Steps */}
        {routeResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-sky-50 p-3.5 rounded-2xl border border-sky-100 text-xs">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-slate-700">Tổng khoảng cách:</span>
                <span className="font-extrabold text-sky-700">{routeResult.totalDistanceMeters} mét</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-slate-700">Đi bộ:</span>
                <span className="font-extrabold text-sky-700">~{routeResult.estimatedMinutes} phút</span>
              </div>
            </div>

            {/* Turn by turn navigation steps */}
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {routeResult.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 leading-relaxed">{step.instruction}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Khoảng {step.distanceMeters}m</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Vẽ Đường Đi Lên Bản Đồ</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
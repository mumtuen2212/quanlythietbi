import React, { useState } from 'react';
import { 
  Building2, 
  Navigation, 
  Layers, 
  MapPin, 
  Plus, 
  Minus, 
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { Building, CampusPOI, Room } from '../types';

interface CampusMapProps {
  buildings: Building[];
  pois: CampusPOI[];
  rooms: Room[];
  selectedBuildingId: number | null;
  onSelectBuilding: (bldgId: number) => void;
  onSelectRoom: (room: Room) => void;
  navigationPath?: { x: number; y: number }[];
  isTechnicianMode?: boolean;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  buildings,
  pois,
  rooms,
  selectedBuildingId,
  onSelectBuilding,
  onSelectRoom,
  navigationPath,
  isTechnicianMode = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const pathD = navigationPath && navigationPath.length > 1
    ? navigationPath.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
    : '';

  return (
    <div className="relative w-full h-[520px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl select-none">
      {/* Map Header Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 text-white flex items-center gap-2 shadow-lg pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold">Bản Đồ Khuôn Viên Toàn Trường (Campus Map)</span>
        </div>

        {isTechnicianMode && (
          <div className="bg-rose-500/20 backdrop-blur-md px-3 py-1 rounded-xl border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Chế độ KTV: Đang bật bản đồ cảnh báo sự cố</span>
          </div>
        )}
      </div>

      {/* Map Control Buttons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-xl">
        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Phóng to"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.6))}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Thu nhỏ"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Đặt lại góc nhìn"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main SVG Vector Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox="0 0 960 620"
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          <defs>
            {/* Campus lawn texture */}
            <pattern id="campusGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>

            {/* Glowing filter for navigation line */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Building 3D Gradients */}
            <linearGradient id="bldgA_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="bldgB_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>
            <linearGradient id="bldgC_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <rect width="960" height="620" fill="#0f172a" />
          <rect width="960" height="620" fill="url(#campusGrid)" />

          {/* Campus Greenery Zones (Công viên, vườn cây) */}
          <rect x="80" y="80" width="100" height="90" rx="16" fill="#14532d" opacity="0.3" />
          <rect x="740" y="80" width="140" height="60" rx="16" fill="#14532d" opacity="0.3" />
          <circle cx="420" cy="230" r="35" fill="#065f46" opacity="0.25" />

          {/* Internal Walkways & Road Network */}
          {/* Main avenue from Gate 1 to Plaza */}
          <path d="M 420 70 L 420 520" stroke="#334155" strokeWidth="24" strokeLinecap="round" />
          <path d="M 420 70 L 420 520" stroke="#64748b" strokeWidth="2" strokeDasharray="6,6" />

          {/* Horizontal avenue between Building A and B */}
          <path d="M 120 230 L 820 230" stroke="#334155" strokeWidth="20" strokeLinecap="round" />
          <path d="M 120 230 L 820 230" stroke="#64748b" strokeWidth="2" strokeDasharray="6,6" />

          {/* Pathway to Canteen and Gate 2 */}
          <path d="M 610 280 L 750 390 L 820 260" stroke="#334155" strokeWidth="14" strokeLinecap="round" />

          {/* Animated Navigation Route Line */}
          {pathD && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.4"
                filter="url(#glow)"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#0284c7"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="8,8"
                strokeLinecap="round"
                className="animate-[dash_1.5s_linear_infinite]"
              />
            </>
          )}

          {/* Campus POI Markers (Cổng, Thư viện, Căng tin, Nhà xe) */}
          {pois.map(poi => {
            const isGate = poi.category === 'GATE';
            return (
              <g key={poi.id} className="cursor-pointer group" transform={`translate(${poi.x}, ${poi.y})`}>
                <circle
                  r={isGate ? 18 : 14}
                  fill={isGate ? '#e11d48' : '#1e293b'}
                  stroke={isGate ? '#f43f5e' : '#475569'}
                  strokeWidth="2"
                  className="group-hover:scale-110 transition-transform shadow-md"
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#ffffff"
                  fontSize={isGate ? "10" : "8"}
                  fontWeight="bold"
                >
                  {isGate ? 'GATE' : 'POI'}
                </text>
                {/* Tooltip text under marker */}
                <rect
                  x="-70"
                  y="18"
                  width="140"
                  height="18"
                  rx="6"
                  fill="#0f172a"
                  opacity="0.9"
                />
                <text
                  x="0"
                  y="30"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="8"
                  fontWeight="600"
                >
                  {poi.name.split('-')[0].trim()}
                </text>
              </g>
            );
          })}

          {/* Building Footprints & 3D Isometric Projection */}
          {buildings.map(bldg => {
            const isSelected = selectedBuildingId === bldg.id;
            const bldgRooms = rooms.filter(r => r.building_id === bldg.id);
            const damagedCount = bldgRooms.filter(r => r.status === 'DAMAGED' || (Boolean(r.pendingReportsCount) && (r.pendingReportsCount ?? 0) > 0)).length;

            return (
              <g
                key={bldg.id}
                onClick={() => onSelectBuilding(bldg.id)}
                onMouseEnter={() => setHoveredBuilding(bldg)}
                onMouseLeave={() => setHoveredBuilding(null)}
                className="cursor-pointer group transition-all"
              >
                {/* 3D Shadow / Extrusion */}
                <rect
                  x={bldg.x + 6}
                  y={bldg.y + 6}
                  width={bldg.width}
                  height={bldg.height}
                  rx="16"
                  fill="#000000"
                  opacity="0.5"
                />

                {/* Building Roof Box */}
                <rect
                  x={bldg.x}
                  y={bldg.y}
                  width={bldg.width}
                  height={bldg.height}
                  rx="16"
                  fill={
                    bldg.id === 1 ? 'url(#bldgA_grad)' : bldg.id === 2 ? 'url(#bldgB_grad)' : 'url(#bldgC_grad)'
                  }
                  stroke={isSelected ? '#38bdf8' : '#ffffff'}
                  strokeWidth={isSelected ? 4 : 1.5}
                  strokeOpacity={isSelected ? 1 : 0.4}
                  className="group-hover:opacity-95 transition-all"
                />

                {/* Floor count badge */}
                <rect
                  x={bldg.x + 12}
                  y={bldg.y + 12}
                  width="44"
                  height="22"
                  rx="8"
                  fill="#000000"
                  opacity="0.4"
                />
                <text
                  x={bldg.x + 34}
                  y={bldg.y + 27}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {bldg.floors} TẦNG
                </text>

                {/* Building Title */}
                <text
                  x={bldg.x + bldg.width / 2}
                  y={bldg.y + bldg.height / 2 - 2}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="800"
                  letterSpacing="0.5"
                >
                  {bldg.name.split('-')[0].trim()}
                </text>
                <text
                  x={bldg.x + bldg.width / 2}
                  y={bldg.y + bldg.height / 2 + 16}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="10"
                  fontWeight="500"
                >
                  {bldg.name.split('-')[1]?.trim() || ''}
                </text>

                {/* Entrance Marker */}
                <circle
                  cx={bldg.entrance_x}
                  cy={bldg.entrance_y}
                  r="6"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Incident / Damage Alert Badge on Building Roof */}
                {damagedCount > 0 && (
                  <g transform={`translate(${bldg.x + bldg.width - 24}, ${bldg.y + 12})`}>
                    <circle r="12" fill="#e11d48" className="animate-ping opacity-75" />
                    <circle r="12" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
                    <text textAnchor="middle" dy="4" fill="#ffffff" fontSize="10" fontWeight="bold">
                      {damagedCount}
                    </text>
                  </g>
                )}

                {/* Click to enter floor plan prompt */}
                <rect
                  x={bldg.x + bldg.width / 2 - 50}
                  y={bldg.y + bldg.height - 28}
                  width="100"
                  height="18"
                  rx="6"
                  fill="#ffffff"
                  opacity={isSelected ? "0.95" : "0.2"}
                  className="group-hover:opacity-90 transition-opacity"
                />
                <text
                  x={bldg.x + bldg.width / 2}
                  y={bldg.y + bldg.height - 16}
                  textAnchor="middle"
                  fill={isSelected ? "#0369a1" : "#ffffff"}
                  fontSize="9"
                  fontWeight="bold"
                >
                  {isSelected ? 'Đang mở sơ đồ tầng' : 'Bấm xem sơ đồ tầng'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Floating Building Preview Card */}
      {selectedBuildingId && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-700 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-900 text-[10px] font-black uppercase">
                Tòa Nhà Được Chọn
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {buildings.find(b => b.id === selectedBuildingId)?.name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">
              {buildings.find(b => b.id === selectedBuildingId)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectBuilding(selectedBuildingId)}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Xem Sơ Đồ Mặt Bằng Chi Tiết</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
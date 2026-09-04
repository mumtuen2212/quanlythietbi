import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Layers, 
  BookOpen, 
  AlertTriangle, 
  Navigation, 
  QrCode, 
  ArrowRight, 
  CheckCircle2, 
  Wrench, 
  Mic, 
  Tv, 
  Volume2, 
  Wind,
  Info,
  X
} from 'lucide-react';
import { Building, Room, Device } from '../types';
import { StatusBadge } from './StatusBadge';

interface FloorPlanMapProps {
  building: Building;
  rooms: Room[];
  selectedFloor: number;
  onSelectFloor: (floor: number) => void;
  selectedRoom: Room | null;
  onSelectRoom: (room: Room | null) => void;
  indoorPath?: { x: number; y: number }[];
  onStartNavigateToRoom?: (room: Room) => void;
  isTechnicianMode?: boolean;
}

export const FloorPlanMap: React.FC<FloorPlanMapProps> = ({
  building,
  rooms,
  selectedFloor,
  onSelectFloor,
  selectedRoom,
  onSelectRoom,
  indoorPath,
  onStartNavigateToRoom,
  isTechnicianMode = false
}) => {
  const floorRooms = rooms.filter(r => r.building_id === building.id && r.floor === selectedFloor);

  const indoorPathD = indoorPath && indoorPath.length > 1
    ? indoorPath.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
    : '';

  return (
    <div className="space-y-4">
      {/* Floor Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black text-sm">
            {building.building_code}
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">{building.name}</h3>
            <p className="text-xs text-slate-500">Chọn tầng để xem mặt bằng phòng học</p>
          </div>
        </div>

        {/* Floor Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {Array.from({ length: building.floors }, (_, i) => i + 1).map(fl => {
            const isFlSelected = fl === selectedFloor;
            const hasDamage = rooms.some(r => r.building_id === building.id && r.floor === fl && (r.status === 'DAMAGED' || (Boolean(r.pendingReportsCount) && (r.pendingReportsCount ?? 0) > 0)));
            return (
              <button
                key={fl}
                onClick={() => {
                  onSelectFloor(fl);
                  onSelectRoom(null);
                }}
                className={`relative px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                  isFlSelected
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Tầng {fl}</span>
                {hasDamage && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive 2D Floor Plan Canvas */}
      <div className="relative w-full h-[460px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-xl select-none">
        {/* Floor Indicator Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-white text-xs font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Mặt Bằng Tầng {selectedFloor} - {building.name.split('-')[0].trim()}</span>
        </div>

        <svg viewBox="0 0 900 320" className="w-full h-full p-4">
          <defs>
            <filter id="indoorGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Building Outer Floor Plate */}
          <rect x="0" y="20" width="900" height="280" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="3" />

          {/* Central Main Hallway Corridor */}
          <rect x="10" y="190" width="880" height="40" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          <text x="450" y="215" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="3">
            HÀNH LANG CHÍNH TẦNG {selectedFloor}
          </text>

          {/* Indoor Navigation Animated Route */}
          {indoorPathD && (
            <>
              <path
                d={indoorPathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#indoorGlow)"
                opacity="0.6"
              />
              <path
                d={indoorPathD}
                fill="none"
                stroke="#0284c7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={indoorPathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="6,6"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Classrooms & Functional Rooms */}
          {floorRooms.map(room => {
            const isRoomSelected = selectedRoom?.id === room.id;
            const isDamaged = room.status === 'DAMAGED' || (Boolean(room.pendingReportsCount) && (room.pendingReportsCount ?? 0) > 0);
            const isMaintenance = room.status === 'MAINTENANCE';

            let fillColor = '#0f172a';
            let strokeColor = '#334155';
            let statusBadgeColor = '#10b981';

            if (isDamaged) {
              fillColor = '#450a0a';
              strokeColor = '#f43f5e';
              statusBadgeColor = '#f43f5e';
            } else if (isMaintenance) {
              fillColor = '#451a03';
              strokeColor = '#f59e0b';
              statusBadgeColor = '#f59e0b';
            } else if (room.room_type === 'STAIRS' || room.room_type === 'ELEVATOR') {
              fillColor = '#1e1b4b';
              strokeColor = '#6366f1';
            } else if (room.room_type === 'OFFICE') {
              fillColor = '#1e293b';
              strokeColor = '#64748b';
            }

            if (isRoomSelected) {
              strokeColor = '#38bdf8';
            }

            return (
              <g
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="cursor-pointer group transition-all"
              >
                {/* Room Boundary Box */}
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx="12"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isRoomSelected ? 3.5 : 1.5}
                  className="group-hover:opacity-90 transition-all"
                />

                {/* Door Opening */}
                <circle
                  cx={room.door_x}
                  cy={room.door_y}
                  r="5"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Status Dot */}
                {room.room_type !== 'STAIRS' && room.room_type !== 'ELEVATOR' && (
                  <circle
                    cx={room.x + room.width - 14}
                    cy={room.y + 14}
                    r="4"
                    fill={statusBadgeColor}
                    className={isDamaged ? "animate-ping" : ""}
                  />
                )}

                {/* Room Number Label */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 - 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="800"
                >
                  {room.room_number}
                </text>

                {/* Room Name Small Label */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 + 12}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  fontWeight="600"
                >
                  {room.name.length > 20 ? room.name.slice(0, 18) + '...' : room.name}
                </text>

                {/* Special Mic Indicator Icon if room has Sisu Mic */}
                {room.room_number === 'A.301' && (
                  <g transform={`translate(${room.x + 8}, ${room.y + 8})`}>
                    <rect width="52" height="16" rx="4" fill="#0284c7" opacity="0.9" />
                    <text x="26" y="11" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                      MIC SISU
                    </text>
                  </g>
                )}

                {room.room_number === 'A.302' && (
                  <g transform={`translate(${room.x + 8}, ${room.y + 8})`}>
                    <rect width="64" height="16" rx="4" fill="#e11d48" opacity="0.9" />
                    <text x="32" y="11" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                      MIC BÁO HỎNG
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {floorRooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
            Chưa có sơ đồ phòng học cho tầng này.
          </div>
        )}
      </div>

      {/* Selected Room Detailed Drawer / Panel */}
      {selectedRoom && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                  {selectedRoom.room_number}
                </span>
                <StatusBadge status={selectedRoom.status} size="sm" />
                <span className="text-xs text-slate-500">Tầng {selectedRoom.floor} • {building.name}</span>
              </div>
              <h4 className="font-extrabold text-lg text-slate-900">{selectedRoom.name}</h4>
              {selectedRoom.description && (
                <p className="text-xs text-slate-600 leading-relaxed">{selectedRoom.description}</p>
              )}
            </div>

            <button
              onClick={() => onSelectRoom(null)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Equipment list in this room */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Thiết bị trong phòng ({selectedRoom.room_number === 'A.301' ? 4 : selectedRoom.room_number === 'A.302' ? 2 : 1})
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {selectedRoom.room_number === 'A.301' && (
                <>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-sky-600" />
                      <span className="font-semibold text-slate-800">Bộ Micro Sisu màu xanh</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Tốt</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-slate-800">Máy chiếu Panasonic PT-LB426</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Tốt</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-slate-800">Âm ly Nanomax Pro-900</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Tốt</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-teal-600" />
                      <span className="font-semibold text-slate-800">Điều hòa Daikin 2.5HP</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Tốt</span>
                  </div>
                </>
              )}

              {selectedRoom.room_number === 'A.302' && (
                <>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-rose-600" />
                      <span className="font-semibold text-rose-900">Bộ Micro Sisu màu xanh (A.302)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">Báo hỏng</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-slate-800">Máy chiếu Epson EB-E01</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">Tốt</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions Button Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {onStartNavigateToRoom && (
                <button
                  onClick={() => onStartNavigateToRoom(selectedRoom)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Chỉ đường đến phòng này</span>
                </button>
              )}

              <Link
                to={`/report-incident?roomId=${selectedRoom.id}`}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Báo hỏng</span>
              </Link>
            </div>

            <Link
              to={`/rooms/${selectedRoom.id}`}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Xem chi tiết phòng & HDSD thiết bị</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
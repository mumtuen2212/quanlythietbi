import React, { useRef, useState } from 'react';
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
  onMapClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
  editable?: boolean;
  onMoveRoom?: (room: Room, position: Pick<Room, 'x' | 'y' | 'width' | 'height' | 'door_x' | 'door_y'>) => void;
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
  isTechnicianMode = false,
  onMapClick,
  editable = false,
  onMoveRoom
}) => {
  const [dragOverrides, setDragOverrides] = useState<Record<number, Pick<Room, 'x' | 'y' | 'width' | 'height' | 'door_x' | 'door_y'>>>({});
  const dragRef = useRef<{ room: Room; pointerId: number; offsetX: number; offsetY: number; position: Pick<Room, 'x' | 'y' | 'width' | 'height' | 'door_x' | 'door_y'> } | null>(null);
  const floorRooms = rooms.filter(r => r.building_id === building.id && r.floor === selectedFloor);
  const availableFloors = Array.from(
    new Set(rooms.filter(r => r.building_id === building.id).map(r => r.floor))
  ).sort((a, b) => a - b);
  const visibleFloors = availableFloors.length > 0 ? availableFloors : [1];
  const maxRoomsPerRow = 10;
  const roomsPerRow = Math.min(maxRoomsPerRow, Math.max(1, floorRooms.length));
  const roomGap = 12;
  const generatedRoomWidth = Math.max(72, Math.min(180, (868 - roomGap * Math.max(0, roomsPerRow - 1)) / roomsPerRow));
  const generatedRoomHeight = 130;

  // Danh mục phòng được nhập từ SQL chưa có tọa độ mặt bằng chi tiết sẽ mang
  // tọa độ 0,0. Tự dàn toàn bộ phòng về cùng một phía hành lang; phòng nào đã
  // được admin kéo thả và lưu vị trí riêng vẫn được giữ nguyên.
  const laidOutFloorRooms = floorRooms.map((room, index) => {
    // Các kích thước lớn từ sơ đồ cũ không còn phù hợp với bố cục một phía.
    // Chỉ giữ vị trí đã kéo thả theo kích thước chuẩn mới.
    const hasCurrentLayout = room.x > 0 && room.y > 0 &&
      Math.abs(room.width - generatedRoomWidth) < 3 && Math.abs(room.height - generatedRoomHeight) < 3;
    if (hasCurrentLayout) {
      const savedPosition = {
        x: room.x,
        y: room.y,
        width: generatedRoomWidth,
        height: generatedRoomHeight,
        door_x: room.x + generatedRoomWidth / 2,
        door_y: room.y + generatedRoomHeight
      };
      const position = { ...savedPosition, ...(dragOverrides[room.id] || {}) };
      return { ...room, ...position };
    }

    const row = Math.floor(index / maxRoomsPerRow);
    const sideIndex = index % maxRoomsPerRow;
    const roomsOnSide = Math.min(maxRoomsPerRow, floorRooms.length - row * maxRoomsPerRow);
    const availableWidth = 868;
    const roomWidth = Math.max(72, Math.min(180, (availableWidth - roomGap * Math.max(0, roomsOnSide - 1)) / Math.max(1, roomsOnSide)));
    const x = 16 + sideIndex * (roomWidth + roomGap);
    const y = 50 + row * 145;
    const height = generatedRoomHeight;

    const { x: _x, y: _y, width: _width, height: _height, door_x: _doorX, door_y: _doorY, ...roomInfo } = room;
    const generatedPosition = {
      x,
      y,
      width: roomWidth,
      height,
      door_x: x + roomWidth / 2,
      door_y: y + height
    };
    return {
      ...roomInfo,
      ...generatedPosition,
      ...(dragOverrides[room.id] || {})
    };
  });

  const roomAtPointer = (event: React.PointerEvent<SVGGElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 900,
      y: ((event.clientY - rect.top) / rect.height) * 420
    };
  };

  const beginDrag = (event: React.PointerEvent<SVGGElement>, room: Room) => {
    if (!editable || !onMoveRoom) return;
    event.preventDefault();
    event.stopPropagation();
    const pointer = roomAtPointer(event);
    const position = { x: room.x, y: room.y, width: room.width, height: room.height, door_x: room.door_x, door_y: room.door_y };
    dragRef.current = { room, pointerId: event.pointerId, offsetX: pointer.x - room.x, offsetY: pointer.y - room.y, position };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<SVGGElement>) => {
    const dragging = dragRef.current;
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const pointer = roomAtPointer(event);
    const x = Math.max(10, Math.min(890 - dragging.position.width, pointer.x - dragging.offsetX));
    const y = Math.max(30, Math.min(390 - dragging.position.height, pointer.y - dragging.offsetY));
    const position = { ...dragging.position, x, y, door_x: x + dragging.position.width / 2, door_y: y + dragging.position.height };
    dragging.position = position;
    setDragOverrides(previous => ({ ...previous, [dragging.room.id]: position }));
  };

  const finishDrag = (event: React.PointerEvent<SVGGElement>) => {
    const dragging = dragRef.current;
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onMoveRoom?.(dragging.room, dragging.position);
  };

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

        {editable && <p className="w-full text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">Chế độ sắp xếp: kéo thả phòng đến vị trí mong muốn. Khi thả, vị trí sẽ được lưu.</p>}

        {/* Floor Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {visibleFloors.map(fl => {
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
      <div className="relative w-full h-[520px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-xl select-none">
        {/* Floor Indicator Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-white text-xs font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>Mặt Bằng Tầng {selectedFloor} - {building.name.split('-')[0].trim()}</span>
        </div>

        <svg viewBox="0 0 900 420" className="w-full h-full p-4" onClick={onMapClick}>
          <defs>
            <filter id="indoorGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Building Outer Floor Plate */}
          <rect x="0" y="20" width="900" height="380" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="3" />

          {/* Central Main Hallway Corridor */}
          <rect x="10" y="205" width="880" height="40" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          <text x="450" y="230" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="3">
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
          {laidOutFloorRooms.map(room => {
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
                onClick={event => {
                  if (editable) event.stopPropagation();
                  onSelectRoom(room);
                }}
                onPointerDown={event => beginDrag(event, room)}
                onPointerMove={moveDrag}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                className={`${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} group transition-all`}
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

        {laidOutFloorRooms.length === 0 && (
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

          <div className="pt-3 border-t border-slate-100 rounded-xl bg-sky-50/70 px-3.5 py-3 text-xs text-sky-800">
            Mở chi tiết phòng để xem danh sách thiết bị, hướng dẫn sử dụng và báo hỏng theo dữ liệu SQL.
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

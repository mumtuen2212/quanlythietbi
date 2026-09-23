import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Navigation, 
  Info, 
  School,
  AlertTriangle,
  DoorOpen,
  Eye,
  Compass
} from 'lucide-react';
import { Building, CampusPOI, Room } from '../types';

const getBuildingCoords = (building: Building): [number, number] => {
  if (Number.isFinite(building.latitude) && Number.isFinite(building.longitude)) {
    return [Number(building.latitude), Number(building.longitude)];
  }
  // Fallback for an older record which has not been placed by an administrator yet.
  return [10.9822 - building.y * 0.000006, 106.6732 + building.x * 0.000006];
};

const getRoomCoords = (room: Room, building?: Building): [number, number] | null => {
  if (Number.isFinite(room.latitude) && Number.isFinite(room.longitude)) {
    return [Number(room.latitude), Number(room.longitude)];
  }
  return building ? getBuildingCoords(building) : null;
};


// Custom DivIcon for Buildings
const createBuildingIcon = (building: Building, hasPending: boolean, isSelected: boolean) => {
  const bgColor = isSelected ? '#0284c7' : building.color || '#4f46e5';
  const pulseClass = hasPending ? 'animate-pulse' : '';

  return L.divIcon({
    className: 'custom-building-marker',
    html: `
      <div style="
        background: ${bgColor};
        color: white;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        border: 2px solid white;
        cursor: pointer;
        position: relative;
        transform: translate(-50%, -50%);
      " class="${pulseClass}">
        <span style="font-weight: 900; font-size: 15px; line-height: 1;">${building.building_code}</span>
        <span style="font-size: 9px; font-weight: 600; opacity: 0.9;">Tòa</span>
        ${
          hasPending
            ? `<span style="
                position: absolute;
                top: -4px;
                right: -4px;
                width: 14px;
                height: 14px;
                background: #f43f5e;
                border: 2px solid white;
                border-radius: 50%;
              "></span>`
            : ''
        }
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [0, 0]
  });
};

const createPoiIcon = (poi: CampusPOI) => L.divIcon({
  className: 'campus-special-point-marker',
  html: `<div style="
    background:#0969da;color:#fff;width:36px;height:36px;border-radius:50%;
    border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.32);
    display:flex;align-items:center;justify-content:center;text-align:center;
    padding:3px;font-size:9px;line-height:1.05;font-weight:800;
    transform:translate(-50%,-50%);cursor:pointer;
  ">${poi.name}</div>`,
  iconSize: [36, 36],
  iconAnchor: [0, 0]
});


const createRoomIcon = (room: Room, isSelected: boolean) => L.divIcon({
  className: 'custom-room-marker',
  html: `
    <div style="
      background: ${isSelected ? '#0284c7' : '#ffffff'};
      color: ${isSelected ? '#ffffff' : '#0f172a'};
      min-width: 42px;
      padding: 4px 7px;
      border-radius: 8px;
      border: 2px solid ${isSelected ? '#0369a1' : '#38bdf8'};
      box-shadow: 0 2px 8px rgba(15,23,42,0.25);
      font-size: 10px;
      font-weight: 800;
      text-align: center;
      white-space: nowrap;
      transform: translate(-50%, -50%);
    ">${room.room_number}</div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});
const createRoomReferenceIcon = () => L.divIcon({
  className: 'room-reference-marker',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(15,23,42,.35);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});
const createRoomRowIcon = (floor: number, roomCount: number, isExpanded: boolean) => L.divIcon({
  className: 'custom-room-row-marker',
  html: `
    <div style="
      background: ${isExpanded ? '#0284c7' : '#1e293b'};
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 10px;
      border: 2px solid ${isExpanded ? '#38bdf8' : '#475569'};
      box-shadow: 0 2px 8px rgba(15,23,42,0.3);
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      text-align: center;
      line-height: 1.3;
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <span>Dãy phòng Tầng ${floor}</span><br/>
      <span style="font-weight: 600; font-size: 9px; opacity: 0.85;">${roomCount} phòng · bấm để xem</span>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 8px rgba(37,99,235,.2),0 2px 8px rgba(15,23,42,.3);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

interface LeafletCampusMapProps {
  buildings: Building[];
  pois: CampusPOI[];
  rooms: Room[];
  selectedBuildingId: number | null;
  onSelectBuilding: (buildingId: number) => void;
  onSelectRoom?: (room: Room) => void;
  onStartNavigateToRoom?: (room: Room) => void;
  onNavigateFromCurrentLocation?: (room: Room, location: { latitude: number; longitude: number }) => void;
  userLocation?: [number, number] | null;
  routeCoordinates?: [number, number][];
  isTechnicianMode?: boolean;
  showCampusEntities?: boolean;
  selectedRoom?: Room | null;
  pickMode?: boolean;
  pickModeMessage?: string;
  onPickBuilding?: (buildingId: number, coords: { lat: number; lng: number }) => void;
  onPickMapPosition?: (coords: { lat: number; lng: number }) => void;
}

// Controller to smoothly pan to selected building
const MapClickHandler: React.FC<{
  pickMode: boolean;
  buildings: Building[];
  onPickBuilding?: (buildingId: number, coords: { lat: number; lng: number }) => void;
  onPickMapPosition?: (coords: { lat: number; lng: number }) => void;
}> = ({ pickMode, buildings, onPickBuilding, onPickMapPosition }) => {
  useMapEvents({
    click(e) {
      if (!pickMode) return;
      const pickedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (onPickMapPosition) {
        onPickMapPosition(pickedCoords);
        return;
      }
      if (!onPickBuilding) return;
      let nearestId: number | null = null;
      let nearestDist = Infinity;
      buildings.forEach(b => {
        const coords = getBuildingCoords(b);
        const dLat = coords[0] - e.latlng.lat;
        const dLng = coords[1] - e.latlng.lng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestId = b.id;
        }
      });
      if (nearestId !== null) {
        onPickBuilding(nearestId, pickedCoords);
      }
    }
  });
  return null;
};

const MAX_MAP_ZOOM = 19;

const MapController: React.FC<{ targetCoords: [number, number] | null }> = ({ targetCoords }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setMaxZoom(MAX_MAP_ZOOM);
    if (targetCoords) {
      // A direct view change keeps room selection precise without the visible
      // fly animation/jitter caused by an adjacent sidebar reflow.
      map.setView(targetCoords, 18, { animate: false });
    }
  }, [targetCoords, map]);
  return null;
};

export const LeafletCampusMap: React.FC<LeafletCampusMapProps> = ({
  buildings,
  pois,
  rooms,
  selectedBuildingId,
  onSelectBuilding,
  onSelectRoom,
  onStartNavigateToRoom,
  onNavigateFromCurrentLocation,
  userLocation,
  routeCoordinates,
  isTechnicianMode = false,
  showCampusEntities = true,
  selectedRoom = null,
  pickMode = false,
  pickModeMessage,
  onPickBuilding,
  onPickMapPosition
}) => {
    const [activeBuildingId, setActiveBuildingId] = useState<number | null>(selectedBuildingId);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [locatingRoomId, setLocatingRoomId] = useState<number | null>(null);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const defaultCenter: [number, number] = [10.9806, 106.6745];

  const roomRowGroups = React.useMemo(() => {
    const groups = new Map<string, { buildingId: number; floor: number; rooms: Room[] }>();
    rooms.forEach(room => {
      const key = `${room.building_id}-${room.floor}`;
      if (!groups.has(key)) {
        groups.set(key, { buildingId: room.building_id, floor: room.floor, rooms: [] });
      }
      groups.get(key)!.rooms.push(room);
    });
    return Array.from(groups.entries());
  }, [rooms]);

  const selectedBuilding = buildings.find(b => b.id === (activeBuildingId || selectedBuildingId));
  const selectedRoomBuilding = selectedRoom ? buildings.find(b => b.id === selectedRoom.building_id) : undefined;
  // Keep this reference stable when the sidebar merely opens/closes. Without
  // memoization Leaflet receives a fresh coordinate array and flies again.
  const targetCoords = React.useMemo(() => {
    if (selectedRoom) return getRoomCoords(selectedRoom, selectedRoomBuilding);
    return selectedBuilding ? getBuildingCoords(selectedBuilding) : null;
  }, [
    selectedRoom?.id, selectedRoom?.latitude, selectedRoom?.longitude,
    selectedRoomBuilding?.id, selectedRoomBuilding?.latitude, selectedRoomBuilding?.longitude,
    selectedBuilding?.id, selectedBuilding?.latitude, selectedBuilding?.longitude,
    selectedBuilding?.x, selectedBuilding?.y
  ]);
  const selectedRoomReferences = React.useMemo(() => {
    if (!selectedRoom) return [];
    return rooms.filter(room => room.building_id === selectedRoom.building_id && room.floor === selectedRoom.floor);
  }, [rooms, selectedRoom]);

  return (
    <div className="relative w-full h-[clamp(360px,58vh,680px)] min-h-[360px] sm:h-[clamp(420px,65vh,680px)] sm:min-h-[420px] xl:h-[clamp(540px,68vh,680px)] xl:min-h-[540px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 flex flex-col">
      {/* Legend / Info Badge */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur p-3 rounded-2xl shadow-lg border border-slate-200 text-xs hidden sm:block max-w-xs">
        <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
          <School className="w-4 h-4 text-sky-600" />
          <span>Khuôn Viên Đại Học Thủ Dầu Một</span>
        </div>
             <p className="text-[11px] text-slate-500 leading-relaxed">
          Chọn một phòng trong danh sách để xem đúng vị trí đã lưu trên bản đồ.
        </p>
      </div>

      {pickMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
          {pickModeMessage || (onPickMapPosition ? 'Bấm vào bản đồ để chọn vị trí tòa nhà' : 'Bấm vào tòa nhà trên bản đồ để tạo phòng')}
        </div>
      )}

      {/* Leaflet Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={17}
        minZoom={15}
        maxZoom={MAX_MAP_ZOOM}
            scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', cursor: pickMode ? 'crosshair' : undefined }}
      >
        <MapController targetCoords={targetCoords} />
        <MapClickHandler pickMode={pickMode} buildings={buildings} onPickBuilding={onPickBuilding} onPickMapPosition={onPickMapPosition} />

        {userLocation && <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={1000} />}
        {routeCoordinates && routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.85, dashArray: '10 8' }}
          />
        )}

        {/* Detailed standard map with a fallback layer underneath. */}
                <TileLayer
          key="osm-base"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          maxZoom={MAX_MAP_ZOOM}
          keepBuffer={4}
        />

        {/* Building Markers */}
        {showCampusEntities && buildings.map(bldg => {
          const coords = getBuildingCoords(bldg);
          const buildingRooms = rooms.filter(r => r.building_id === bldg.id);
          const pendingCount = buildingRooms.reduce(
            (acc, r) => acc + (r.pendingReportsCount || 0),
            0
          );
          const isSelected = bldg.id === selectedBuildingId;

          return (
            <Marker
              key={`bldg-${bldg.id}`}
              position={coords}
              icon={createBuildingIcon(bldg, pendingCount > 0, isSelected)}
              eventHandlers={{
                click: () => {
                  setActiveBuildingId(bldg.id);
                  if (pickMode && onPickMapPosition) {
                    onPickMapPosition({ lat: coords[0], lng: coords[1] });
                  } else if (pickMode && onPickBuilding) {
                    onPickBuilding(bldg.id, { lat: coords[0], lng: coords[1] });
                  }
                }
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {bldg.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                      Tòa {bldg.building_code}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {bldg.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Số tầng:</span>
                      <span className="font-bold text-slate-800">{bldg.floors} Tầng</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Số phòng:</span>
                      <span className="font-bold text-slate-800">{buildingRooms.length} Phòng</span>
                    </div>
                  </div>

                  {pendingCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-3 bg-rose-50 px-2 py-1 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{pendingCount} sự cố cần xử lý</span>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectBuilding(bldg.id)}
                    className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-sky-600/30 transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Xem Sơ Đồ Tầng</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

                {/* "Dãy phòng" cluster markers: click to reveal its rooms. */}
        {showCampusEntities && roomRowGroups.map(([key, group]) => {
          const building = buildings.find(item => item.id === group.buildingId);
          if (!building) return null;
          const buildingCoords = getBuildingCoords(building);

          const buildingFloors = Array.from(
            new Set(rooms.filter(r => r.building_id === group.buildingId).map(r => r.floor))
          ).sort((a, b) => a - b);
          const floorIdx = Math.max(buildingFloors.indexOf(group.floor), 0);
          const angle = (floorIdx / Math.max(buildingFloors.length, 1)) * Math.PI * 2;
          const radius = 0.00016 + group.floor * 0.00002;
          const position: [number, number] = [
            buildingCoords[0] + Math.sin(angle) * radius,
            buildingCoords[1] + Math.cos(angle) * radius
          ];
          const isExpanded = expandedRowKey === key;

          return (
            <Marker
              key={`row-${key}`}
              position={position}
              icon={createRoomRowIcon(group.floor, group.rooms.length, isExpanded)}
              eventHandlers={{
                click: () => {
                  setExpandedRowKey(prev => (prev === key ? null : key));
                  setSelectedRoomId(null);
                }
              }}
            />
          );
        })}

        {/* Individual room markers: only shown for the currently expanded "dãy phòng". */}
        {showCampusEntities && rooms.map((room, index) => {
          const rowKey = `${room.building_id}-${room.floor}`;
          if (expandedRowKey !== rowKey) return null;

          const building = buildings.find(item => item.id === room.building_id);
          if (!building) return null;
          const buildingCoords = getBuildingCoords(building);

          const roomsInBuilding = rooms.filter(item => item.building_id === room.building_id && item.floor === room.floor);
          const roomIndex = roomsInBuilding.findIndex(item => item.id === room.id);
          const angle = (roomIndex / Math.max(roomsInBuilding.length, 1)) * Math.PI * 2;
          const radius = 0.00018 + (room.floor * 0.00003);
          const position: [number, number] = [
            buildingCoords[0] + Math.sin(angle) * radius,
            buildingCoords[1] + Math.cos(angle) * radius
          ];
          const isSelected = selectedRoomId === room.id;
          return (
            <Marker
              key={`room-${room.id}`}
              position={position}
              icon={createRoomIcon(room, isSelected)}
              eventHandlers={{
                click: () => {
                  setSelectedRoomId(room.id);
                }
              }}
            >
              <Popup>
                <div className="min-w-[175px] p-1">
                  <p className="font-extrabold text-sm text-slate-900">{room.room_number}</p>
                  <p className="text-[11px] text-slate-500 mb-3">Chọn chỉ đường đến phòng này</p>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRoom?.(room);
                      onStartNavigateToRoom?.(room);
                    }}
                    className="w-full rounded-lg bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-700"
                  >
                    Chỉ đường từ cổng
                  </button>
                  <button
                    type="button"
                    disabled={locatingRoomId === room.id}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        window.alert('Trình duyệt không hỗ trợ định vị.');
                        return;
                      }
                      setLocatingRoomId(room.id);
                      navigator.geolocation.getCurrentPosition(
                        position => {
                          setLocatingRoomId(null);
                          onSelectRoom?.(room);
                          onNavigateFromCurrentLocation?.(room, {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                          });
                        },
                        () => {
                          setLocatingRoomId(null);
                          window.alert('Không lấy được vị trí. Vui lòng cấp quyền định vị rồi thử lại.');
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                      );
                    }}
                    className="w-full mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                  >
                    {locatingRoomId === room.id ? 'Đang lấy vị trí...' : 'Dùng vị trí của tôi'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* On the public map, only the selected room and rooms on the same floor
            are shown.  Their latitude/longitude comes from SQL, not a static UI map. */}
        {!showCampusEntities && selectedRoomReferences.map(room => {
          const building = buildings.find(item => item.id === room.building_id);
          const position = getRoomCoords(room, building);
          if (!position) return null;
          const isSelected = room.id === selectedRoom?.id;
          return (
            <Marker
              key={`selected-room-reference-${room.id}`}
              position={position}
              icon={isSelected ? createRoomIcon(room, true) : createRoomReferenceIcon()}
              zIndexOffset={isSelected ? 900 : 500}
              eventHandlers={{ click: () => onSelectRoom?.(room) }}
            >
              <Popup>
                <div className="min-w-[160px] p-1">
                  <p className="font-extrabold text-sm text-slate-900">{room.room_number}</p>
                  <p className="text-[11px] text-slate-500">{room.name}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Gates and other campus services use round map points; buildings do not. */}
        {pois.filter(poi => Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude)).map(poi => (
          <Marker key={`poi-${poi.id}`} position={[Number(poi.latitude), Number(poi.longitude)]} icon={createPoiIcon(poi)}>
            <Popup>
              <div className="min-w-[180px] p-1">
                <p className="font-extrabold text-sm text-slate-900">{poi.name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Điểm {poi.category === 'GATE' ? 'ra vào' : 'tiện ích'} trong khuôn viên.</p>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
};

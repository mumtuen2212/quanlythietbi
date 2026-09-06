import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Coordinates mapping for Campus Buildings & POIs (TDMU Area, Thu Dau Mot, Binh Duong)
// Center: [10.9806, 106.6745]
const BUILDING_COORDS: Record<number, [number, number]> = {
  1: [10.9808, 106.6740], // Tòa A
  2: [10.9814, 106.6750], // Tòa B
  3: [10.9798, 106.6747]  // Tòa C
};

const POI_COORDS: Record<string, [number, number]> = {
  'POI-GATE-1': [10.9822, 106.6742],
  'POI-GATE-2': [10.9802, 106.6762],
  'POI-PARKING-1': [10.9808, 106.6758],
  'POI-CANTEEN': [10.9794, 106.6753],
  'POI-LIBRARY': [10.9816, 106.6732],
  'POI-SPORTS': [10.9792, 106.6738],
  'POI-ADMIN': [10.9811, 106.6736]
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

// Custom DivIcon for POIs
const createPoiIcon = (poi: CampusPOI) => {
  const getPoiColor = () => {
    switch (poi.category) {
      case 'GATE': return '#059669';
      case 'LIBRARY': return '#7c3aed';
      case 'CANTEEN': return '#ea580c';
      case 'PARKING': return '#64748b';
      case 'SPORTS': return '#0891b2';
      case 'ADMIN': return '#2563eb';
      default: return '#475569';
    }
  };

  return L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div style="
        background: ${getPoiColor()};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 2px solid white;
        cursor: pointer;
        font-weight: bold;
        font-size: 11px;
        transform: translate(-50%, -50%);
      ">
        📍
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [0, 0]
  });
};

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
}

// Controller to smoothly pan to selected building
const MAX_MAP_ZOOM = 19;

const MapController: React.FC<{ targetCoords: [number, number] | null }> = ({ targetCoords }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setMaxZoom(MAX_MAP_ZOOM);
    if (targetCoords) {
      map.flyTo(targetCoords, 18, { duration: 1.2 });
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
  isTechnicianMode = false
}) => {
  const [activeBuildingId, setActiveBuildingId] = useState<number | null>(selectedBuildingId);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [locatingRoomId, setLocatingRoomId] = useState<number | null>(null);

  const defaultCenter: [number, number] = [10.9806, 106.6745];

  const selectedBuilding = buildings.find(b => b.id === (activeBuildingId || selectedBuildingId));
  const targetCoords = selectedBuilding && BUILDING_COORDS[selectedBuilding.id]
    ? BUILDING_COORDS[selectedBuilding.id]
    : null;

  return (
    <div className="relative w-full h-[clamp(360px,58vh,680px)] min-h-[360px] sm:h-[clamp(420px,65vh,680px)] sm:min-h-[420px] xl:h-[clamp(540px,68vh,680px)] xl:min-h-[540px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 flex flex-col">
      {/* Legend / Info Badge */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur p-3 rounded-2xl shadow-lg border border-slate-200 text-xs hidden sm:block max-w-xs">
        <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
          <School className="w-4 h-4 text-sky-600" />
          <span>Khuôn Viên Đại Học Thủ Dầu Một</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Nhấp vào Marker tòa nhà để xem số phòng học, thiết bị và chuyển trực tiếp tới Sơ đồ mặt bằng tầng.
        </p>
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={17}
        minZoom={15}
        maxZoom={MAX_MAP_ZOOM}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController targetCoords={targetCoords} />

        {userLocation && <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={1000} />}
        {routeCoordinates && routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.85, dashArray: '10 8' }}
          />
        )}

        {/* Detailed standard map with a fallback layer underneath. */}
        <TileLayer
          key="carto-base"
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          keepBuffer={4}
        />
        <TileLayer
          key="osm-overlay"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          keepBuffer={4}
        />

        {/* Building Markers */}
        {buildings.map(bldg => {
          const coords = BUILDING_COORDS[bldg.id] || defaultCenter;
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

        {/* Room markers: distributed around the selected building so rooms are directly discoverable on the map. */}
        {rooms.map((room, index) => {
          const buildingCoords = BUILDING_COORDS[room.building_id];
          if (!buildingCoords) return null;

          const roomsInBuilding = rooms.filter(item => item.building_id === room.building_id);
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

        {/* POI Markers */}
        {pois.map(poi => {
          const coords = POI_COORDS[poi.id];
          if (!coords) return null;

          return (
            <Marker
              key={poi.id}
              position={coords}
              icon={createPoiIcon(poi)}
            >
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <div className="font-bold text-xs text-slate-900 mb-1">
                    {poi.name}
                  </div>
                  {poi.description && (
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {poi.description}
                    </p>
                  )}
                  <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Khu vực: {poi.category}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

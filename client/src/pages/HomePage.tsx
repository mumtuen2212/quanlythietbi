import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  QrCode, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Layers,
  ArrowRight,
  Mic,
  Tv,
  Volume2,
  Wind,
  Navigation,
  Compass
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Building, Room, DashboardStats, CampusPOI } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { LeafletCampusMap } from '../components/LeafletCampusMap';
import { FloorPlanMap } from '../components/FloorPlanMap';
import { RoutePlannerModal } from '../components/RoutePlannerModal';
import { PathfindingService, RouteResult } from '../services/pathfinding';

interface HomePageProps {
  isTechnicianMode?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ isTechnicianMode = false }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [pois, setPois] = useState<CampusPOI[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Map View States
  const [viewMode, setViewMode] = useState<'leaflet' | 'floor'>('leaflet');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(1);
  const [selectedFloor, setSelectedFloor] = useState<number>(3);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Navigation & Route Planner
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [buildingsData, poisData, roomsData, statsData] = await Promise.all([
        ApiService.getBuildings().catch(() => []),
        ApiService.getPois().catch(() => []),
        ApiService.getRooms().catch(() => []),
        ApiService.getStats().catch(() => null)
      ]);

      const safeBuildings = Array.isArray(buildingsData) ? buildingsData : [];
      const safePois = Array.isArray(poisData) ? poisData : [];
      const safeRooms = Array.isArray(roomsData) ? roomsData : [];

      setBuildings(safeBuildings);
      setPois(safePois);
      setRooms(safeRooms);
      setStats(statsData);

      if (safeBuildings.length > 0) {
        setSelectedBuildingId(safeBuildings[0].id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBuildingFromMap = (bldgId: number) => {
    setSelectedBuildingId(bldgId);
    setSelectedFloor(bldgId === 1 ? 3 : 1);
    setViewMode('floor');
  };

  const handleApplyRoute = (route: RouteResult) => {
    setActiveRoute(route);
    setViewMode('leaflet');
  };

  const handleStartNavigateToRoom = (room: Room) => {
    if (!room) return;
    const route = PathfindingService_fallback(room);
    setActiveRoute(route);
    const gateCoordinates: [number, number] = [10.9822, 106.6742];
    const buildingCoordinates: Record<number, [number, number]> = {
      1: [10.9808, 106.6740],
      2: [10.9814, 106.6750],
      3: [10.9798, 106.6747]
    };
    const destination = buildingCoordinates[room.building_id];
    setRouteCoordinates(destination ? [gateCoordinates, destination] : []);
    setSelectedRoom(room);
    setViewMode('leaflet');
  };

  const handleNavigateFromCurrentLocation = async (room: Room, location: { latitude: number; longitude: number }) => {
    const buildingCoordinates: Record<number, [number, number]> = {
      1: [10.9808, 106.6740],
      2: [10.9814, 106.6750],
      3: [10.9798, 106.6747]
    };
    const destination = buildingCoordinates[room.building_id];
    if (!destination) return;

    setUserLocation([location.latitude, location.longitude]);
    setSelectedRoom(room);
    setSelectedBuildingId(room.building_id);
    setViewMode('leaflet');

    const gates = [
      { id: 'POI-GATE-1', latitude: 10.9822, longitude: 106.6742 },
      { id: 'POI-GATE-2', latitude: 10.9802, longitude: 106.6762 }
    ];
    const nearestGate = gates.reduce((closest, gate) => {
      const distance = Math.hypot(location.latitude - gate.latitude, location.longitude - gate.longitude);
      const closestDistance = Math.hypot(location.latitude - closest.latitude, location.longitude - closest.longitude);
      return distance < closestDistance ? gate : closest;
    });

    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/foot/${location.longitude},${location.latitude};${destination[1]},${destination[0]}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error('Routing service unavailable');
      const data = await response.json();
      const routeData = data.routes?.[0];
      if (!routeData) throw new Error('No route found');

      setRouteCoordinates(routeData.geometry.coordinates.map(([longitude, latitude]: [number, number]) => [latitude, longitude]));
      setActiveRoute({
        fromName: 'Vị trí hiện tại của bạn',
        toName: room.room_number,
        totalDistanceMeters: Math.round(routeData.distance),
        estimatedMinutes: Math.max(1, Math.ceil(routeData.duration / 60)),
        steps: [{ instruction: `Đi theo tuyến đường ngắn nhất đến Tòa ${room.building_code || room.building_id}, sau đó lên Tầng ${room.floor} đến ${room.room_number}.`, distanceMeters: Math.round(routeData.distance), icon: 'walk' }],
        campusPoints: [],
        floorPoints: []
      });
    } catch {
      const route = PathfindingService.findRoute(nearestGate.id, `ROOM-${room.id}`);
      setRouteCoordinates([[location.latitude, location.longitude], destination]);
      setActiveRoute({ ...route, fromName: `Vị trí hiện tại (gần ${nearestGate.id === 'POI-GATE-1' ? 'Cổng 1' : 'Cổng 2'})` });
    }
  };

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedBuildingId(room.building_id);
    setSelectedFloor(room.floor);
    setViewMode('leaflet');
  };

  const PathfindingService_fallback = (room: Room): RouteResult => {
    const roomIdStr = `ROOM-${room.id}`;
    return PathfindingService.findRoute('POI-GATE-1', roomIdStr);
  };

  // SỬA LỖI TẠI ĐÂY: Thêm phòng vệ (buildings || []) và ?.find
  const safeBuildingsList = buildings || [];
  const currentBuilding = safeBuildingsList.find(b => b?.id === selectedBuildingId) || safeBuildingsList[0];

  // SỬA LỖI TẠI ĐÂY: Thêm phòng vệ cho rooms.filter
  const safeRoomsList = rooms || [];
  const filteredRooms = safeRoomsList.filter(room => {
    if (!room) return false;
    const matchesBuilding = selectedBuildingId ? room.building_id === selectedBuildingId : true;
    const matchesSearch = (room.room_number || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                          (room.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    return matchesBuilding && matchesSearch;
  });
  const mapRooms = safeRoomsList.filter(room => {
    if (!room) return false;
    const normalizedSearch = (searchTerm || '').toLowerCase();
    return (room.room_number || '').toLowerCase().includes(normalizedSearch) ||
      (room.name || '').toLowerCase().includes(normalizedSearch) ||
      (room.building_code || '').toLowerCase().includes(normalizedSearch);
  });
  const groupedMapRooms = mapRooms.reduce<Record<string, Room[]>>((groups, room) => {
    const groupKey = `${room.building_code || `Tòa ${room.building_id}`}|${room.floor}`;
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(room);
    return groups;
  }, {});

  return (
    <div className="space-y-8 pb-20 md:pb-12">
      {/* Top Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold backdrop-blur">
              <Compass className="w-3.5 h-3.5" />
              <span>Bản Đồ Số Hóa Khuôn Viên & Sơ Đồ Thiết Bị Phòng Học</span>
            </div>

            {isTechnicianMode && (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold">
                Quyền Kỹ Thuật Viên CSVC
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Bản đồ trường học, tìm đường đi & <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">quản lý thiết bị</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Xem vị trí phòng học trên bản đồ 2D trực quan, chỉ đường từ cổng tới tận cửa phòng, kiểm tra thiết bị (Micro Sisu màu xanh, máy chiếu...) và gửi báo hỏng 1-chạm.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsRouteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-sky-500/30 transition-all hover:scale-105"
            >
              <Navigation className="w-4 h-4" />
              <span>Chỉ Đường / Tìm Đường Đi</span>
            </button>

            <Link
              to="/qr-scanner"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur transition-all"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>Quét mã QR Bàn GV</span>
            </Link>

            <Link
              to="/manuals"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur transition-all"
            >
              <Mic className="w-4 h-4 text-sky-400" />
              <span>HDSD Mic Sisu Xanh</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* Active Route Notification Banner */}
      {activeRoute && (
        <div className="bg-sky-50 border border-sky-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
                <span>Đang hiển thị lộ trình chỉ đường</span>
                <span>•</span>
                <span>{activeRoute.totalDistanceMeters}m (~{activeRoute.estimatedMinutes} phút đi bộ)</span>
              </div>
              <p className="text-sm font-extrabold text-slate-900">
                {activeRoute.fromName} <span className="text-sky-600 font-bold">➔</span> {activeRoute.toName}
              </p>
              <p className="text-xs text-slate-600 font-medium">{activeRoute.steps?.[0]?.instruction}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsRouteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors shadow-sm"
            >
              Xem chi tiết các bước
            </button>
            <button
              onClick={() => setActiveRoute(null)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Tắt chỉ đường
            </button>
          </div>
        </div>
      )}

      {/* Interactive Map Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode('leaflet')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'leaflet'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Compass className="w-4 h-4 text-sky-300" />
              <span>Bản Đồ Leaflet</span>
            </button>

            <button
              onClick={() => setViewMode('floor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'floor'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-white" />
              <span>Sơ Đồ Mặt Bằng Tầng (Floor Plan)</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Click vào tòa nhà hoặc phòng để xem thiết bị</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[clamp(260px,24vw,320px)_minmax(0,1fr)] gap-3 items-start">
          <aside className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col h-[min(440px,50vh)] min-h-[300px] sm:h-[min(520px,60vh)] sm:min-h-[380px] xl:h-[min(600px,70vh)] xl:min-h-[420px] xl:sticky xl:top-4">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Phòng</p>
                  <p className="text-sm font-extrabold text-slate-900">Tra cứu trên bản đồ</p>
                </div>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-full">
                  {mapRooms.length} phòng
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm phòng, tòa nhà..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {mapRooms.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">Không tìm thấy phòng phù hợp.</p>
              ) : (
                Object.entries(groupedMapRooms).map(([groupKey, groupRooms]) => {
                  const [buildingCode, floor] = groupKey.split('|');
                  return (
                    <div key={groupKey} className="space-y-1">
                      <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <span>{buildingCode} · Tầng {floor}</span>
                        <span>{groupRooms.length}</span>
                      </div>
                      {groupRooms.map(room => {
                        const isSelected = selectedRoom?.id === room.id;
                        return (
                          <div
                            key={room.id}
                            className={`flex items-center gap-2 rounded-xl p-2.5 transition-colors ${isSelected ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50'}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectRoom(room)}
                              className="flex items-center gap-2 min-w-0 flex-1 text-left"
                            >
                              <span className="w-7 h-7 shrink-0 rounded-lg bg-sky-600 text-white flex items-center justify-center text-[10px] font-extrabold">
                                {room.building_code || 'P'}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-xs font-extrabold text-slate-800 truncate">{room.room_number}</span>
                                <span className="block text-[10px] text-slate-500 truncate">{room.name}</span>
                              </span>
                            </button>
                            <Link
                              to={`/rooms/${room.id}`}
                              title={`Xem chi tiết phòng ${room.room_number}`}
                              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => { setSelectedRoom(null); setViewMode('leaflet'); }}
              className="m-3 py-2.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-extrabold hover:bg-sky-100 transition-colors"
            >
              Xem toàn bộ khuôn viên
            </button>
          </aside>

          <div className="min-w-0 w-full">
            {viewMode === 'leaflet' ? (
              <LeafletCampusMap
                buildings={safeBuildingsList}
                pois={pois || []}
                rooms={safeRoomsList}
                selectedBuildingId={selectedBuildingId}
                onSelectBuilding={handleSelectBuildingFromMap}
                onSelectRoom={handleSelectRoom}
                onStartNavigateToRoom={handleStartNavigateToRoom}
                onNavigateFromCurrentLocation={handleNavigateFromCurrentLocation}
                userLocation={userLocation}
                routeCoordinates={routeCoordinates}
                isTechnicianMode={isTechnicianMode}
              />
            ) : (
              currentBuilding && (
                <FloorPlanMap
                  building={currentBuilding}
                  rooms={safeRoomsList}
                  selectedFloor={selectedFloor}
                  onSelectFloor={fl => setSelectedFloor(fl)}
                  selectedRoom={selectedRoom}
                  onSelectRoom={r => setSelectedRoom(r)}
                  indoorPath={activeRoute?.floorPoints?.map(p => ({ x: p.x, y: p.y }))}
                  onStartNavigateToRoom={handleStartNavigateToRoom}
                  isTechnicianMode={isTechnicianMode}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tổng phòng học</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalRooms || 0}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tổng thiết bị</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalDevices || 0}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Đang hoạt động tốt</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-600">{stats.activeDevices || 0}</span>
                <span className="text-xs text-emerald-600 font-semibold">({stats.deviceHealthRatio || 0}%)</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Sự cố chờ xử lý</p>
              <p className="text-2xl font-bold text-rose-600">{stats.pendingReports || 0}</p>
            </div>
          </div>
        </section>
      )}

      {/* Buildings & Classroom Explorer Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <span>Danh Sách Phòng Học Theo Tòa Nhà</span>
            </h2>
            <p className="text-sm text-slate-500">Tra cứu nhanh trang thiết bị của từng phòng học</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm số phòng (vd: A.301, B.201)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Building Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedBuildingId(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedBuildingId === null
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tất cả tòa nhà ({safeRoomsList.length})
          </button>

          {safeBuildingsList.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBuildingId(b.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                selectedBuildingId === b.id
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Room Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">Đang tải danh sách phòng học...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center p-8">
            <p className="text-slate-500 font-medium">Không tìm thấy phòng học nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map(room => (
              <Link
                key={room.id}
                to={`/rooms/${room.id}`}
                className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors">
                          {room.room_number}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Tầng {room.floor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{room.name}</p>
                    </div>

                    <StatusBadge status={room.status} size="sm" />
                  </div>

                  {room.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {room.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-sky-50 text-sky-600" title="Micro không dây"><Mic className="w-3.5 h-3.5" /></span>
                      <span className="p-1 rounded bg-indigo-50 text-indigo-600" title="Máy chiếu"><Tv className="w-3.5 h-3.5" /></span>
                      <span className="p-1 rounded bg-amber-50 text-amber-600" title="Âm ly / Loa"><Volume2 className="w-3.5 h-3.5" /></span>
                      <span className="p-1 rounded bg-teal-50 text-teal-600" title="Điều hòa"><Wind className="w-3.5 h-3.5" /></span>
                    </div>

                    <span className="font-semibold text-slate-700">Mã QR: {room.qr_code}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600 group-hover:text-sky-700">
                  <span>Xem chi tiết thiết bị & HDSD</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Route Planner Modal */}
      <RoutePlannerModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        onApplyRoute={handleApplyRoute}
      />
    </div>
  );
};
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
  MapPin,
  Compass
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Building, Room, DashboardStats, CampusPOI } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CampusMap } from '../components/CampusMap';
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
  const [viewMode, setViewMode] = useState<'campus' | 'floor'>('campus');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(1);
  const [selectedFloor, setSelectedFloor] = useState<number>(3);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

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
    if (route?.floorPoints?.length > 0) {
      const dest = route.floorPoints[0];
      setSelectedBuildingId(dest.buildingId);
      setSelectedFloor(dest.floor);
    }
  };

  const handleStartNavigateToRoom = (room: Room) => {
    if (!room) return;
    const route = PathfindingService_fallback(room);
    setActiveRoute(route);
    setViewMode('floor');
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('campus')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === 'campus'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>Khuôn Viên Toàn Trường (Campus View)</span>
            </button>

            <button
              onClick={() => setViewMode('floor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === 'floor'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
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

        {viewMode === 'campus' ? (
          <CampusMap
            buildings={safeBuildingsList}
            pois={pois || []}
            rooms={safeRoomsList}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={handleSelectBuildingFromMap}
            onSelectRoom={room => {
              setSelectedRoom(room);
              setViewMode('floor');
            }}
            navigationPath={activeRoute?.campusPoints}
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
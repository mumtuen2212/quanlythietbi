export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  icon?: 'walk' | 'stairs' | 'elevator' | 'door' | 'gate' | 'turn-left' | 'turn-right';
  floorChange?: { from: number; to: number };
}

export interface RouteResult {
  fromName: string;
  toName: string;
  totalDistanceMeters: number;
  estimatedMinutes: number;
  steps: NavigationStep[];
  campusPoints: { x: number; y: number }[];
  floorPoints: { x: number; y: number; floor: number; buildingId: number }[];
}

export interface MapLocationOption {
  id: string;
  name: string;
  category: 'Cổng' | 'Tòa nhà' | 'Phòng học' | 'Tiện ích' | 'Nhà xe';
  buildingId?: number;
  floor?: number;
  roomId?: number;
}

// Campus waypoints
export const CAMPUS_LOCATIONS: MapLocationOption[] = [
  { id: 'POI-GATE-1', name: 'Cổng 1 - Cổng Chính (Đường Lê Hồng Phong)', category: 'Cổng' },
  { id: 'POI-GATE-2', name: 'Cổng 2 - Cổng Phụ (Ký Túc Xá & Gửi xe)', category: 'Cổng' },
  { id: 'POI-ADMIN', name: 'Tòa Nhà Điều Hành & Ban Giám Hiệu', category: 'Tòa nhà' },
  { id: 'POI-LIBRARY', name: 'Trung Tâm Thư Viện & Học Liệu', category: 'Tiện ích' },
  { id: 'POI-CANTEEN', name: 'Căng Tin & Khu Ăn Uống Sinh Viên', category: 'Tiện ích' },
  { id: 'POI-PARKING-1', name: 'Nhà Xe Sinh Viên Khu A-B', category: 'Nhà xe' },
  { id: 'POI-SPORTS', name: 'Khu Thể Thao & Sân Bóng Rổ', category: 'Tiện ích' },
  { id: 'BUILDING-A', name: 'Tòa Nhà A (Sảnh Tầng 1)', category: 'Tòa nhà', buildingId: 1, floor: 1 },
  { id: 'BUILDING-B', name: 'Tòa Nhà B (Sảnh Tầng 1)', category: 'Tòa nhà', buildingId: 2, floor: 1 },
  { id: 'BUILDING-C', name: 'Tòa Nhà C (Hội Trường Lớn)', category: 'Tòa nhà', buildingId: 3, floor: 1 },
  { id: 'ROOM-1', name: 'Phòng A.301 (Mic Sisu xanh, Máy chiếu)', category: 'Phòng học', buildingId: 1, floor: 3, roomId: 1 },
  { id: 'ROOM-2', name: 'Phòng A.302 (Đang Báo Hỏng)', category: 'Phòng học', buildingId: 1, floor: 3, roomId: 2 },
  { id: 'ROOM-6', name: 'Phòng A.303 (Đa năng tương tác)', category: 'Phòng học', buildingId: 1, floor: 3, roomId: 6 },
  { id: 'ROOM-7', name: 'Phòng A.304 (Trực Kỹ thuật CSVC Tầng 3)', category: 'Phòng học', buildingId: 1, floor: 3, roomId: 7 },
  { id: 'ROOM-3', name: 'Phòng A.401 (Chuyên đề Tầng 4)', category: 'Phòng học', buildingId: 1, floor: 4, roomId: 3 },
  { id: 'ROOM-4', name: 'Phòng Lab B.201 (Mạng & An ninh mạng)', category: 'Phòng học', buildingId: 2, floor: 2, roomId: 4 },
  { id: 'ROOM-10', name: 'Phòng Lab B.202 (AI & Data Science)', category: 'Phòng học', buildingId: 2, floor: 2, roomId: 10 },
  { id: 'ROOM-5', name: 'Hội trường Lớn C.101', category: 'Phòng học', buildingId: 3, floor: 1, roomId: 5 }
];

export const PathfindingService = {
  findRoute: (fromId: string, toId: string): RouteResult => {
    const fromLoc = CAMPUS_LOCATIONS.find(l => l.id === fromId) || CAMPUS_LOCATIONS[0];
    const toLoc = CAMPUS_LOCATIONS.find(l => l.id === toId) || CAMPUS_LOCATIONS[10];

    const steps: NavigationStep[] = [];
    const campusPoints: { x: number; y: number }[] = [];
    const floorPoints: { x: number; y: number; floor: number; buildingId: number }[] = [];

    // Base coordinates map
    const coordsMap: Record<string, { x: number; y: number }> = {
      'POI-GATE-1': { x: 420, y: 70 },
      'POI-GATE-2': { x: 820, y: 260 },
      'POI-ADMIN': { x: 420, y: 180 },
      'POI-LIBRARY': { x: 120, y: 220 },
      'POI-CANTEEN': { x: 750, y: 390 },
      'POI-PARKING-1': { x: 800, y: 150 },
      'POI-SPORTS': { x: 120, y: 400 },
      'BUILDING-A': { x: 330, y: 280 },
      'BUILDING-B': { x: 610, y: 280 },
      'BUILDING-C': { x: 475, y: 470 },
      'ROOM-1': { x: 330, y: 280 },
      'ROOM-2': { x: 330, y: 280 },
      'ROOM-6': { x: 330, y: 280 },
      'ROOM-7': { x: 330, y: 280 },
      'ROOM-3': { x: 330, y: 280 },
      'ROOM-4': { x: 610, y: 280 },
      'ROOM-10': { x: 610, y: 280 },
      'ROOM-5': { x: 475, y: 470 }
    };

    const startCampus = coordsMap[fromId] || { x: 420, y: 70 };
    const endCampus = coordsMap[toId] || { x: 330, y: 280 };

    campusPoints.push(startCampus);

    // Intermediate waypoint through center plaza if between far buildings/gates
    const centerPlaza = { x: 420, y: 230 };
    if (Math.hypot(startCampus.x - endCampus.x, startCampus.y - endCampus.y) > 150) {
      campusPoints.push(centerPlaza);
    }
    campusPoints.push(endCampus);

    // Build step 1: Campus walk
    if (fromId !== toId) {
      const distCampus = Math.round(Math.hypot(startCampus.x - endCampus.x, startCampus.y - endCampus.y) * 0.8) + 20;
      steps.push({
        instruction: `Xuất phát từ ${fromLoc.name}, đi theo trục đường nội bộ (${distCampus}m) hướng tới ${toLoc.buildingId ? (toLoc.buildingId === 1 ? 'Tòa Nhà A' : toLoc.buildingId === 2 ? 'Tòa Nhà B' : 'Tòa Nhà C') : toLoc.name}`,
        distanceMeters: distCampus,
        icon: fromId.includes('GATE') ? 'gate' : 'walk'
      });
    }

    // If destination is a room inside a building
    if (toLoc.buildingId) {
      const bldgName = toLoc.buildingId === 1 ? 'Tòa Nhà A' : toLoc.buildingId === 2 ? 'Tòa Nhà B' : 'Tòa Nhà C';
      
      steps.push({
        instruction: `Bước vào sảnh chính ${bldgName} (Tầng 1)`,
        distanceMeters: 15,
        icon: 'door'
      });

      if (toLoc.floor && toLoc.floor > 1) {
        steps.push({
          instruction: `Đi đến cụm Cầu thang bộ / Thang máy phía Đông, di chuyển lên Tầng ${toLoc.floor}`,
          distanceMeters: (toLoc.floor - 1) * 25,
          icon: 'stairs',
          floorChange: { from: 1, to: toLoc.floor }
        });
      }

      if (toLoc.roomId) {
        // Floor hallway path
        floorPoints.push({ x: 860, y: 210, floor: toLoc.floor || 1, buildingId: toLoc.buildingId }); // Elevator/stairs lobby
        
        let targetDoor = { x: 150, y: 180 };
        let turn = 'Rẽ phải';

        if (toId === 'ROOM-1') {
          targetDoor = { x: 150, y: 180 };
          turn = 'Đi thẳng về phía Tây hành lang 35m';
        } else if (toId === 'ROOM-2') {
          targetDoor = { x: 360, y: 180 };
          turn = 'Đi dọc hành lang 25m';
        } else if (toId === 'ROOM-6') {
          targetDoor = { x: 570, y: 180 };
          turn = 'Đi dọc hành lang 15m';
        } else if (toId === 'ROOM-7') {
          targetDoor = { x: 755, y: 180 };
          turn = 'Rẽ trái ngay cạnh cầu thang';
        } else if (toId === 'ROOM-4') {
          targetDoor = { x: 170, y: 180 };
          turn = 'Đi dọc hành lang Lab Tầng 2';
        }

        floorPoints.push({ x: targetDoor.x, y: 210, floor: toLoc.floor || 1, buildingId: toLoc.buildingId });
        floorPoints.push({ x: targetDoor.x, y: targetDoor.y, floor: toLoc.floor || 1, buildingId: toLoc.buildingId });

        steps.push({
          instruction: `${turn} tới cửa ${toLoc.name}. Bạn đã đến nơi!`,
          distanceMeters: 20,
          icon: 'door'
        });
      }
    }

    const totalDist = steps.reduce((acc, s) => acc + s.distanceMeters, 0);
    const estMin = Math.max(1, Math.ceil(totalDist / 70)); // Average walking speed ~70m/min

    return {
      fromName: fromLoc.name,
      toName: toLoc.name,
      totalDistanceMeters: totalDist,
      estimatedMinutes: estMin,
      steps,
      campusPoints,
      floorPoints
    };
  }
};
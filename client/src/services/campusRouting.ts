import walkways from '../data/campusWalkways.json';
import type { RouteResult } from './pathfinding';

export type Coordinates = [number, number];
export interface WalkingNetwork {
  nodes: Record<string, number[]>;
  edges: string[][];
}
export interface RouteLocation { id: string; name: string; coordinates: Coordinates }

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const dLat = (b[0] - a[0]) * radians;
  const dLon = (b[1] - a[1]) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * radians) * Math.cos(b[0] * radians) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

// Project onto an actual OSM way segment, never connect arbitrary coordinates
// with a straight line through a building. The unsurveyed last metres stay off
// the drawn route; the room marker continues to show the saved destination.
function snap(point: Coordinates, network: WalkingNetwork) {
  const lonScale = Math.cos(point[0] * Math.PI / 180);
  let nearest: { edge: number; t: number; point: Coordinates; distance: number } | null = null;
  network.edges.forEach(([aId, bId], edge) => {
    const a = network.nodes[aId] as Coordinates, b = network.nodes[bId] as Coordinates;
    if (!a || !b) return;
    const dx = (b[1] - a[1]) * lonScale, dy = b[0] - a[0];
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, (((point[1] - a[1]) * lonScale) * dx + (point[0] - a[0]) * dy) / lengthSquared)) : 0;
    const projected: Coordinates = [a[0] + t * dy, a[1] + t * (b[1] - a[1])];
    const distance = distanceMeters(point, projected);
    if (!nearest || distance < nearest.distance) nearest = { edge, t, point: projected, distance };
  });
  return nearest as { edge: number; t: number; point: Coordinates; distance: number } | null;
}

export function findWalkingRoute(from: RouteLocation, to: RouteLocation, network: WalkingNetwork = walkways): RouteResult {
  if (![...from.coordinates, ...to.coordinates].every(Number.isFinite)) throw new Error('Điểm xuất phát hoặc điểm đến chưa có tọa độ hợp lệ.');
  const start = snap(from.coordinates, network), end = snap(to.coordinates, network);
  if (!start || !end) throw new Error('Chưa có dữ liệu lối đi cho khu vực này.');
  if (start.distance > 100) throw new Error('Vị trí của bạn ở ngoài vùng chỉ đường nội khu. Hãy chọn một cổng trường làm điểm xuất phát.');
  if (end.distance > 100) throw new Error('Điểm đến quá xa lối đi đã có dữ liệu. Cần kiểm tra lại tọa độ phòng hoặc bổ sung lối đi.');
  const nodes: Record<string, Coordinates> = Object.fromEntries(Object.entries(network.nodes).map(([id, p]) => [id, p as Coordinates]));
  nodes['route-start'] = start.point;
  nodes['route-end'] = end.point;
  const adjacency = new Map<string, { id: string; cost: number }[]>();
  const connect = (a: string, b: string) => {
    const cost = distanceMeters(nodes[a], nodes[b]);
    adjacency.set(a, [...(adjacency.get(a) || []), { id: b, cost }]);
    adjacency.set(b, [...(adjacency.get(b) || []), { id: a, cost }]);
  };
  network.edges.forEach(([a, b], edge) => {
    const cuts = [{ id: a, t: 0 }, { id: b, t: 1 }];
    if (start.edge === edge) cuts.push({ id: 'route-start', t: start.t });
    if (end.edge === edge) cuts.push({ id: 'route-end', t: end.t });
    cuts.sort((x, y) => x.t - y.t);
    for (let i = 1; i < cuts.length; i++) connect(cuts[i - 1].id, cuts[i].id);
  });
  const costs = new Map<string, number>([['route-start', 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    let current: string | undefined, lowest = Infinity;
    for (const [id, cost] of costs) if (!visited.has(id) && cost < lowest) { current = id; lowest = cost; }
    if (!current) throw new Error('Các lối đi ở hai điểm chưa nối với nhau trong dữ liệu bản đồ. Không thể vẽ tuyến an toàn.');
    if (current === 'route-end') break;
    visited.add(current);
    for (const next of adjacency.get(current) || []) {
      const cost = lowest + next.cost;
      if (cost < (costs.get(next.id) ?? Infinity)) { costs.set(next.id, cost); previous.set(next.id, current); }
    }
  }
  const ids = ['route-end'];
  while (ids[0] !== 'route-start') ids.unshift(previous.get(ids[0])!);
  const coordinates = ids.map(id => nodes[id]).filter((p, i, all) => i === 0 || distanceMeters(p, all[i - 1]) > 0.01);
  if (coordinates.length === 1) coordinates.push([...coordinates[0]]);
  const totalDistanceMeters = Math.round(costs.get('route-end') || 0);
  return {
    fromName: from.name, toName: to.name, coordinates,
    totalDistanceMeters, estimatedMinutes: Math.max(1, Math.ceil(totalDistanceMeters / 70)),
    steps: [
      { instruction: `Đi theo tuyến màu xanh dọc lối đi đã được ghi nhận trên OpenStreetMap tới ${to.name}.`, distanceMeters: totalDistanceMeters, icon: 'walk' },
      { instruction: 'Tuyến kết thúc ở lối đi gần điểm đến, không đi xuyên tòa nhà. Vào tòa và tìm tầng/phòng theo biển chỉ dẫn.', distanceMeters: 0, icon: 'door' }
    ],
    notice: `Vị trí xuất phát cách lối đi khoảng ${Math.round(start.distance)}m; điểm đến cách lối đi khoảng ${Math.round(end.distance)}m. Khoảng cách tuyến không bao gồm các đoạn này.`,
    campusPoints: [], floorPoints: []
  };
}

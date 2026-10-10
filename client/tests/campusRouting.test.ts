import test from 'node:test';
import assert from 'node:assert/strict';
import { findWalkingRoute, distanceMeters, type Coordinates, type WalkingNetwork } from '../src/services/campusRouting';
import actual from '../src/data/campusWalkways.json';

const network: WalkingNetwork = {
  nodes: { a: [10.98, 106.674], b: [10.981, 106.674], c: [10.981, 106.675], d: [10.98, 106.675] },
  edges: [['a', 'b'], ['b', 'c'], ['c', 'd']]
};
const location = (id: string, coordinates: Coordinates) => ({ id, name: id, coordinates });
test('follows connected roads around the block instead of drawing across it', () => {
  const route = findWalkingRoute(location('start', [10.98, 106.674]), location('end', [10.98, 106.675]), network);
  assert.deepEqual(route.coordinates, [network.nodes.a, network.nodes.b, network.nodes.c, network.nodes.d]);
  assert.ok(route.totalDistanceMeters > 300);
});
test('two positions on the same road use the partial road, not a detour via its endpoints', () => {
  const route = findWalkingRoute(location('start', [10.9802, 106.674]), location('end', [10.9808, 106.674]), network);
  assert.equal(route.coordinates?.length, 2);
  assert.ok(route.totalDistanceMeters > 60 && route.totalDistanceMeters < 75);
});
test('no imaginary last leg is drawn from the road through the destination building', () => {
  const route = findWalkingRoute(location('start', [10.98, 106.674]), location('building', [10.9805, 106.6741]), network);
  assert.equal(route.coordinates?.at(-1)?.[1], 106.674);
  assert.match(route.notice || '', /không bao gồm/);
});
test('disconnected roads return an error, never a diagonal fallback', () => {
  assert.throws(() => findWalkingRoute(location('start', [10.98, 106.674]), location('end', [10.98, 106.675]), { ...network, edges: [['a', 'b'], ['c', 'd']] }), /chưa nối/);
});
test('a location far outside campus is rejected', () => {
  assert.throws(() => findWalkingRoute(location('start', [10.9, 106.6]), location('end', [10.98, 106.675]), network), /ngoài vùng/);
});
test('same destination works without fake distance or an infinite loop', () => {
  const route = findWalkingRoute(location('start', [10.9805, 106.674]), location('end', [10.9805, 106.674]), network);
  assert.equal(route.totalDistanceMeters, 0);
});
test('real campus route segments remain on downloaded OSM way segments', () => {
  const route = findWalkingRoute(location('D', [10.9800, 106.6742]), location('A1', [10.9819, 106.6750]));
  assert.ok(route.coordinates!.length > 3);
  assert.ok(route.totalDistanceMeters < 650);
  const liesOn = (p: Coordinates, a: Coordinates, b: Coordinates) => Math.abs(distanceMeters(a, p) + distanceMeters(p, b) - distanceMeters(a, b)) < 0.1;
  const points = route.coordinates!;
  for (let i = 1; i < points.length; i++) {
    assert.ok(actual.edges.some(([a, b]) => liesOn(points[i - 1], actual.nodes[a as keyof typeof actual.nodes] as Coordinates, actual.nodes[b as keyof typeof actual.nodes] as Coordinates) && liesOn(points[i], actual.nodes[a as keyof typeof actual.nodes] as Coordinates, actual.nodes[b as keyof typeof actual.nodes] as Coordinates)), 'Every line must be an actual road segment or part of one');
  }
});

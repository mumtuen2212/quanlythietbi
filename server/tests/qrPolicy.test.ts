import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreateQr, automaticQrCode, createSavedQr } from '../src/qrPolicy';
import type { User } from '../src/data/types';
const user = (role_name: User['role_name'], permissions: User['permissions'] = []) => ({ role_name, permissions } as User);
test('admin can generate room and device labels', () => {
  assert.equal(canCreateQr(user('ADMIN'), 'room'), true);
  assert.equal(canCreateQr(user('ADMIN'), 'device'), true);
});
test('room and device permissions are independent and enforced for non-admins', () => {
  const technician = user('TECHNICIAN', ['MANAGE_DEVICES']);
  assert.equal(canCreateQr(technician, 'device'), true);
  assert.equal(canCreateQr(technician, 'room'), false);
  const delegated = user('TEACHER', ['MANAGE_ROOMS']);
  assert.equal(canCreateQr(delegated, 'room'), true);
  assert.equal(canCreateQr(delegated, 'device'), false);
});
test('anonymous and view-only accounts cannot generate QR', () => {
  assert.equal(canCreateQr(undefined, 'room'), false);
  assert.equal(canCreateQr(user('STUDENT', ['VIEW_REPORTS', 'CREATE_REPORT']), 'device'), false);
});
test('an existing code is retained so already printed labels keep working', () => {
  assert.equal(automaticQrCode('room', { id: 1, room_number: 'A1-102', qr_code: 'CUSTOM-EXISTING' }), 'CUSTOM-EXISTING');
});
test('new codes use the selected target identifier with an ID fallback', () => {
  assert.equal(automaticQrCode('room', { id: 1, room_number: 'A1-102' }), 'QR-ROOM-A1-102');
  assert.equal(automaticQrCode('device', { id: 2, device_code: 'TV-123' }), 'QR-EQ-TV-123');
  assert.equal(automaticQrCode('device', { id: 2 }), 'QR-EQ-2');
});

const repository = () => {
  let room = { id: 1, name: 'Phòng A1-102', room_number: 'A1-102', qr_code: '' };
  let device = { id: 2, name: 'Tivi', device_code: 'TV-123', qr_code: '' };
  let updates = 0;
  return {
    get updates() { return updates; },
    getRoomById: async () => room,
    getDeviceById: async () => device,
    getRoomByQr: async (code: string) => room.qr_code === code ? room : null,
    getDeviceByQr: async (code: string) => device.qr_code === code ? device : null,
    updateRoom: async (_id: number, payload: { qr_code: string }) => { updates++; room = { ...room, ...payload }; return room; },
    updateDevice: async (_id: number, payload: { qr_code: string }) => { updates++; device = { ...device, ...payload }; return device; }
  };
};
test('new room/device QR is persisted and can be looked up by the scanner', async () => {
  const db = repository();
  const room = await createSavedQr('room', 1, db), device = await createSavedQr('device', 2, db);
  assert.equal((await db.getRoomByQr(room.code))?.id, 1);
  assert.equal((await db.getDeviceByQr(device.code))?.id, 2);
  assert.equal(db.updates, 2);
});
test('generating an already printed code again does not modify the stored code', async () => {
  const db = repository();
  const first = await createSavedQr('room', 1, db), second = await createSavedQr('room', 1, db);
  assert.deepEqual(first, second);
  assert.equal(db.updates, 1);
});
test('a duplicate belonging to a different target prevents a write', async () => {
  const db = repository();
  db.getDeviceByQr = async () => ({ id: 2, name: 'Other', device_code: 'OTHER', qr_code: 'QR-ROOM-A1-102' });
  await assert.rejects(() => createSavedQr('room', 1, db), /trùng/);
  assert.equal(db.updates, 0);
});

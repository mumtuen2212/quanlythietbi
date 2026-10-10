import type { User } from './data/types';

export type QrTarget = 'room' | 'device';
export const canCreateQr = (user: User | undefined, type: QrTarget): boolean =>
  Boolean(user && (user.role_name === 'ADMIN' || user.permissions?.includes(type === 'room' ? 'MANAGE_ROOMS' : 'MANAGE_DEVICES')));

export function automaticQrCode(type: QrTarget, target: { id: number; qr_code?: string; room_number?: string; device_code?: string }): string {
  return target.qr_code?.trim() || `${type === 'room' ? 'QR-ROOM' : 'QR-EQ'}-${(type === 'room' ? target.room_number : target.device_code)?.trim() || target.id}`;
}

interface QrRecord { id: number; name: string; qr_code?: string; room_number?: string; device_code?: string }
interface QrRepository {
  getRoomById(id: number): Promise<QrRecord | null>;
  getDeviceById(id: number): Promise<QrRecord | null>;
  getRoomByQr(code: string): Promise<QrRecord | null>;
  getDeviceByQr(code: string): Promise<QrRecord | null>;
  updateRoom(id: number, payload: { qr_code: string }): Promise<QrRecord | null>;
  updateDevice(id: number, payload: { qr_code: string }): Promise<QrRecord | null>;
}
export class QrCreationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function createSavedQr(type: QrTarget, id: number, repository: QrRepository) {
  const target = type === 'room' ? await repository.getRoomById(id) : await repository.getDeviceById(id);
  if (!target) throw new QrCreationError(404, 'Phòng hoặc thiết bị không còn tồn tại.');
  const code = automaticQrCode(type, target);
  const [roomMatch, deviceMatch] = await Promise.all([repository.getRoomByQr(code), repository.getDeviceByQr(code)]);
  if ((roomMatch && (type !== 'room' || roomMatch.id !== id)) || (deviceMatch && (type !== 'device' || deviceMatch.id !== id))) {
    throw new QrCreationError(409, 'Mã QR này trùng với đối tượng khác. Hãy kiểm tra mã trong phần quản lý trước khi in tem.');
  }
  if (target.qr_code !== code) {
    const saved = type === 'room' ? await repository.updateRoom(id, { qr_code: code }) : await repository.updateDevice(id, { qr_code: code });
    if (!saved) throw new QrCreationError(404, 'Đối tượng không còn tồn tại khi lưu QR.');
  }
  return { type, id, code, name: target.name };
}

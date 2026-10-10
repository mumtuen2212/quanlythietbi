"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCreationError = exports.canCreateQr = void 0;
exports.automaticQrCode = automaticQrCode;
exports.createSavedQr = createSavedQr;
const canCreateQr = (user, type) => Boolean(user && (user.role_name === 'ADMIN' || user.permissions?.includes(type === 'room' ? 'MANAGE_ROOMS' : 'MANAGE_DEVICES')));
exports.canCreateQr = canCreateQr;
function automaticQrCode(type, target) {
    return target.qr_code?.trim() || `${type === 'room' ? 'QR-ROOM' : 'QR-EQ'}-${(type === 'room' ? target.room_number : target.device_code)?.trim() || target.id}`;
}
class QrCreationError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.QrCreationError = QrCreationError;
async function createSavedQr(type, id, repository) {
    const target = type === 'room' ? await repository.getRoomById(id) : await repository.getDeviceById(id);
    if (!target)
        throw new QrCreationError(404, 'Phòng hoặc thiết bị không còn tồn tại.');
    const code = automaticQrCode(type, target);
    const [roomMatch, deviceMatch] = await Promise.all([repository.getRoomByQr(code), repository.getDeviceByQr(code)]);
    if ((roomMatch && (type !== 'room' || roomMatch.id !== id)) || (deviceMatch && (type !== 'device' || deviceMatch.id !== id))) {
        throw new QrCreationError(409, 'Mã QR này trùng với đối tượng khác. Hãy kiểm tra mã trong phần quản lý trước khi in tem.');
    }
    if (target.qr_code !== code) {
        const saved = type === 'room' ? await repository.updateRoom(id, { qr_code: code }) : await repository.updateDevice(id, { qr_code: code });
        if (!saved)
            throw new QrCreationError(404, 'Đối tượng không còn tồn tại khi lưu QR.');
    }
    return { type, id, code, name: target.name };
}

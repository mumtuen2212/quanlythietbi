"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const qrcode_1 = __importDefault(require("qrcode"));
const db_1 = require("../data/db");
const sqlDb_1 = require("../data/sqlDb");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
// Multer configuration for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
// ================= DASHBOARD & STATS =================
router.get('/stats', async (req, res) => {
    try {
        const stats = await sqlDb_1.SqlDatabase.getDashboardStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Không thể tải thống kê từ SQL Server:', error);
        res.status(503).json({ success: false, message: 'Không thể tải thống kê. Vui lòng thử lại sau.' });
    }
});
// ================= BUILDINGS & ROOMS =================
router.get('/pois', async (req, res) => {
    try {
        const pois = await sqlDb_1.SqlDatabase.getPois();
        res.json({ success: true, data: pois });
    }
    catch (error) {
        console.error('Không thể tải điểm trên bản đồ từ SQL Server:', error);
        res.status(503).json({ success: false, message: 'Không thể tải điểm trên bản đồ. Vui lòng thử lại sau.' });
    }
});
router.get('/buildings', async (req, res) => {
    try {
        const buildings = await sqlDb_1.SqlDatabase.getBuildings();
        res.json({ success: true, data: buildings });
    }
    catch (error) {
        console.error('Không thể tải danh sách tòa nhà từ SQL Server:', error);
        res.status(503).json({ success: false, message: 'Không thể tải danh sách tòa nhà. Vui lòng thử lại sau.' });
    }
});
router.post('/buildings', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const { building_code, name, description, x, y, width, height, floors, color, entrance_x, entrance_y, latitude, longitude } = req.body;
        if (!String(building_code || '').trim() || !String(name || '').trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã và tên tòa nhà' });
        }
        const building = await sqlDb_1.SqlDatabase.addBuilding({
            building_code: String(building_code).trim().toUpperCase(),
            name: String(name).trim(),
            description: String(description || ''),
            x: Number(x) || 500,
            y: Number(y) || 350,
            width: Number(width) || 200,
            height: Number(height) || 140,
            floors: Math.max(1, Number(floors) || 1),
            color: String(color || '#2563eb'),
            entrance_x: Number(entrance_x) || Number(x) || 500,
            entrance_y: Number(entrance_y) || Number(y) || 350,
            latitude: latitude === undefined ? null : Number(latitude),
            longitude: longitude === undefined ? null : Number(longitude)
        });
        return res.status(201).json({ success: true, data: building });
    }
    catch (error) {
        if (error?.number === 2627 || error?.number === 2601 || /duplicate key|unique key/i.test(String(error?.message || ''))) {
            return res.status(409).json({
                success: false,
                message: `Mã tòa "${String(req.body.building_code || '').trim().toUpperCase()}" đã tồn tại. Vui lòng chọn một mã khác, ví dụ D hoặc E.`
            });
        }
        return res.status(500).json({ success: false, message: error.message || 'Không thể thêm tòa nhà' });
    }
});
router.patch('/buildings/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
        return res.status(400).json({ success: false, message: 'Mã tòa không hợp lệ' });
    try {
        const building = await sqlDb_1.SqlDatabase.updateBuilding(id, req.body);
        if (!building)
            return res.status(404).json({ success: false, message: 'Tòa/dãy không tồn tại' });
        return res.json({ success: true, data: building });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Không thể cập nhật tòa/dãy' });
    }
});
router.delete('/buildings/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
        return res.status(400).json({ success: false, message: 'Mã tòa không hợp lệ' });
    try {
        const deleted = await sqlDb_1.SqlDatabase.deleteBuilding(id);
        if (!deleted)
            return res.status(404).json({ success: false, message: 'Tòa/dãy không tồn tại' });
        return res.json({ success: true, message: 'Đã xóa tòa/dãy và các phòng thuộc tòa' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Không thể xóa tòa/dãy' });
    }
});
router.get('/rooms', async (req, res) => {
    try {
        const buildingId = req.query.building_id ? parseInt(req.query.building_id) : undefined;
        const floor = req.query.floor ? parseInt(req.query.floor) : undefined;
        const rooms = await sqlDb_1.SqlDatabase.getRooms(buildingId, floor);
        res.json({ success: true, data: rooms });
    }
    catch (error) {
        // The JSON fallback can be stale after a create, update, or delete. Never
        // return it for rooms, otherwise the UI can show a room that no longer
        // exists in SQL Server.
        console.error('Không thể tải danh sách phòng từ SQL Server:', error);
        res.status(503).json({ success: false, message: 'Không thể tải danh sách phòng. Vui lòng thử lại sau.' });
    }
});
router.get('/rooms/:id', async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const room = await sqlDb_1.SqlDatabase.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Phòng học không tồn tại' });
        }
        res.json({ success: true, data: room });
    }
    catch (error) {
        console.error(`Không thể tải phòng ${req.params.id} từ SQL Server:`, error);
        res.status(503).json({ success: false, message: 'Không thể tải thông tin phòng. Vui lòng thử lại sau.' });
    }
});
router.get('/rooms/qr/:qrCode', async (req, res) => {
    try {
        const room = await sqlDb_1.SqlDatabase.getRoomByQr(req.params.qrCode);
        if (!room) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phòng tương ứng với mã QR' });
        }
        const detailedRoom = await sqlDb_1.SqlDatabase.getRoomById(room.id);
        res.json({ success: true, data: detailedRoom });
    }
    catch (error) {
        console.error(`Không thể tải phòng từ mã QR ${req.params.qrCode}:`, error);
        res.status(503).json({ success: false, message: 'Không thể tải thông tin phòng. Vui lòng thử lại sau.' });
    }
});
router.post('/rooms', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const { building_id, room_number, name, floor, qr_code, status, description, x, y, width, height, room_type, door_x, door_y, latitude, longitude } = req.body;
        const newRoom = await sqlDb_1.SqlDatabase.addRoom({
            building_id: parseInt(building_id),
            room_number: room_number || '',
            name: name || room_number || 'Phòng mới',
            floor: parseInt(floor) || 1,
            qr_code: qr_code || `QR-ROOM-${String(room_number || 'NEW').toUpperCase()}`,
            status: status || 'ACTIVE',
            description: description || '',
            x: parseFloat(x) || 0,
            y: parseFloat(y) || 0,
            width: parseFloat(width) || 180,
            height: parseFloat(height) || 120,
            room_type: room_type || 'CLASSROOM',
            door_x: parseFloat(door_x) || 50,
            door_y: parseFloat(door_y) || 50,
            latitude: latitude === undefined ? null : parseFloat(latitude),
            longitude: longitude === undefined ? null : parseFloat(longitude)
        });
        return res.json({ success: true, data: newRoom });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/rooms/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        const { building_id, room_number, name, floor, qr_code, status, description, x, y, width, height, room_type, door_x, door_y, latitude, longitude } = req.body;
        const allowedStatuses = ['ACTIVE', 'MAINTENANCE', 'CLOSED'];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái phòng không hợp lệ' });
        }
        const updated = await sqlDb_1.SqlDatabase.updateRoom(roomId, {
            building_id: building_id === undefined ? undefined : parseInt(building_id),
            room_number,
            name,
            floor: floor === undefined ? undefined : parseInt(floor),
            qr_code,
            status,
            description,
            x: x === undefined ? undefined : parseFloat(x),
            y: y === undefined ? undefined : parseFloat(y),
            width: width === undefined ? undefined : parseFloat(width),
            height: height === undefined ? undefined : parseFloat(height),
            room_type,
            door_x: door_x === undefined ? undefined : parseFloat(door_x),
            door_y: door_y === undefined ? undefined : parseFloat(door_y),
            latitude: latitude === undefined ? undefined : parseFloat(latitude),
            longitude: longitude === undefined ? undefined : parseFloat(longitude)
        });
        if (!updated)
            return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/rooms/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), async (req, res) => {
    const roomId = parseInt(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
        return res.status(400).json({ success: false, message: 'Mã phòng không hợp lệ' });
    }
    try {
        const deleted = await sqlDb_1.SqlDatabase.deleteRoom(roomId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
        }
        return res.json({ success: true, message: 'Đã xóa phòng' });
    }
    catch (error) {
        console.error(`[DELETE /rooms/${roomId}] Xóa trong SQL Server thất bại:`, error);
        return res.status(500).json({
            success: false,
            message: `Không thể xóa phòng trong cơ sở dữ liệu chính. Có thể phòng này vẫn còn liên kết dữ liệu khác. Chi tiết: ${error.message}`
        });
    }
});
// ================= CATEGORIES & DEVICES =================
router.get('/categories', async (req, res) => {
    try {
        const categories = await sqlDb_1.SqlDatabase.getCategories();
        res.json({ success: true, data: categories });
    }
    catch (err) {
        const categories = db_1.Database.getCategories();
        res.json({ success: true, data: categories });
    }
});
router.get('/devices', async (req, res) => {
    try {
        const categoryId = req.query.category_id ? parseInt(req.query.category_id) : undefined;
        const status = req.query.status;
        const roomId = req.query.room_id ? parseInt(req.query.room_id) : undefined;
        let devices = await sqlDb_1.SqlDatabase.getDevices(categoryId, status);
        if (roomId) {
            devices = devices.filter(d => d.room_id === roomId);
        }
        res.json({ success: true, data: devices });
    }
    catch (err) {
        const categoryId = req.query.category_id ? parseInt(req.query.category_id) : undefined;
        const status = req.query.status;
        const roomId = req.query.room_id ? parseInt(req.query.room_id) : undefined;
        let devices = db_1.Database.getDevices(categoryId, status);
        if (roomId) {
            devices = devices.filter(d => d.room_id === roomId);
        }
        res.json({ success: true, data: devices });
    }
});
router.get('/devices/:id', async (req, res) => {
    const devId = parseInt(req.params.id);
    try {
        const device = await sqlDb_1.SqlDatabase.getDeviceById(devId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
        }
        res.json({ success: true, data: device });
    }
    catch (err) {
        const device = db_1.Database.getDeviceById(devId);
        if (!device) {
            return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
        }
        res.json({ success: true, data: device });
    }
});
router.get('/devices/qr/:qrCode', async (req, res) => {
    try {
        const dev = await sqlDb_1.SqlDatabase.getDeviceByQr(req.params.qrCode);
        if (!dev) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị tương ứng với mã QR' });
        }
        const detailedDev = await sqlDb_1.SqlDatabase.getDeviceById(dev.id);
        res.json({ success: true, data: detailedDev });
    }
    catch (err) {
        const dev = db_1.Database.getDeviceByQr(req.params.qrCode);
        if (!dev) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị tương ứng với mã QR' });
        }
        const detailedDev = db_1.Database.getDeviceById(dev.id);
        res.json({ success: true, data: detailedDev });
    }
});
router.post('/devices', auth_1.authenticateToken, (0, auth_1.requirePermission)('MANAGE_DEVICES'), async (req, res) => {
    try {
        const { room_id, category_id, device_code, name, model, serial_number, is_portable, purchase_date, warranty_expiry, specifications } = req.body;
        const qr_code = `QR-DEV-${device_code.toUpperCase()}`;
        const newDevice = await sqlDb_1.SqlDatabase.addDevice({
            room_id: room_id ? parseInt(room_id) : null,
            category_id: parseInt(category_id),
            device_code,
            name,
            model: model || '',
            serial_number: serial_number || '',
            status: 'ACTIVE',
            is_portable: Boolean(is_portable),
            qr_code,
            purchase_date: purchase_date || new Date().toISOString().slice(0, 10),
            warranty_expiry: warranty_expiry || '',
            specifications: specifications || {}
        });
        res.json({ success: true, data: newDevice });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/devices/:id/status', auth_1.authenticateToken, (0, auth_1.requirePermission)('MANAGE_DEVICES'), async (req, res) => {
    const devId = parseInt(req.params.id);
    const { status } = req.body;
    try {
        const updated = await sqlDb_1.SqlDatabase.updateDeviceStatus(devId, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
        }
        res.json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/devices/:id', auth_1.authenticateToken, (0, auth_1.requirePermission)('MANAGE_DEVICES'), async (req, res) => {
    try {
        const devId = parseInt(req.params.id);
        const { room_id, category_id, device_code, name, model, serial_number, status, is_portable, purchase_date, warranty_expiry, specifications } = req.body;
        const allowedStatuses = ['ACTIVE', 'DAMAGED', 'UNDER_MAINTENANCE', 'LIQUIDATED'];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái thiết bị không hợp lệ' });
        }
        const updated = await sqlDb_1.SqlDatabase.updateDevice(devId, {
            room_id: room_id === '' || room_id === null ? null : room_id === undefined ? undefined : parseInt(room_id),
            category_id: category_id === undefined ? undefined : parseInt(category_id),
            device_code,
            name,
            model,
            serial_number,
            status,
            is_portable,
            purchase_date,
            warranty_expiry,
            specifications,
            qr_code: device_code ? `QR-DEV-${device_code.toUpperCase()}` : undefined
        });
        if (!updated)
            return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
router.delete('/devices/:id', auth_1.authenticateToken, (0, auth_1.requirePermission)('MANAGE_DEVICES'), async (req, res) => {
    const devId = parseInt(req.params.id);
    try {
        await sqlDb_1.SqlDatabase.deleteDevice(devId);
        return res.json({ success: true, message: 'Đã xóa thiết bị' });
    }
    catch (error) {
        console.error(`[DELETE /devices/${devId}] Xóa trong SQL Server thất bại:`, error);
        return res.status(500).json({
            success: false,
            message: `Không thể xóa thiết bị. Có thể thiết bị này vẫn còn liên kết dữ liệu khác. Chi tiết: ${error.message}`
        });
    }
});
// ================= MANUALS & FAQS =================
router.get('/manuals', async (req, res) => {
    try {
        const manuals = await sqlDb_1.SqlDatabase.getManuals();
        res.json({ success: true, data: manuals });
    }
    catch {
        const manuals = db_1.Database.getManuals();
        res.json({ success: true, data: manuals });
    }
});
router.get('/manuals/:id', async (req, res) => {
    const manualId = parseInt(req.params.id);
    try {
        const manual = await sqlDb_1.SqlDatabase.getManualById(manualId);
        if (!manual) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu hướng dẫn' });
        }
        res.json({ success: true, data: manual });
    }
    catch {
        const manual = db_1.Database.getManualById(manualId);
        if (!manual) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu hướng dẫn' });
        }
        res.json({ success: true, data: manual });
    }
});
router.get('/manuals/device/:deviceId', async (req, res) => {
    const devId = parseInt(req.params.deviceId);
    try {
        const manual = await sqlDb_1.SqlDatabase.getManualByDeviceId(devId);
        if (manual) {
            return res.json({ success: true, data: manual });
        }
    }
    catch { }
    const device = db_1.Database.getDeviceById(devId);
    if (!device) {
        return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
    }
    const manual = db_1.Database.getManualByDeviceId(devId) || db_1.Database.getManualByCategoryId(device.category_id);
    if (!manual) {
        return res.status(404).json({ success: false, message: 'Chưa có hướng dẫn sử dụng cho thiết bị này' });
    }
    res.json({ success: true, data: manual });
});
// ================= INCIDENT REPORTS (BÁO HỎNG) =================
router.get('/incident-reports', async (req, res) => {
    const status = req.query.status;
    const roomId = req.query.room_id ? parseInt(req.query.room_id) : undefined;
    try {
        const reports = await sqlDb_1.SqlDatabase.getIncidentReports(status, roomId);
        res.json({ success: true, data: reports });
    }
    catch {
        const reports = db_1.Database.getIncidentReports(status, roomId);
        res.json({ success: true, data: reports });
    }
});
router.post('/incident-reports', auth_1.optionalAuth, upload.array('images', 5), async (req, res) => {
    try {
        const { room_id, device_id, title, description, priority } = req.body;
        let { reporter_name, reporter_phone, reporter_role } = req.body;
        if (req.user) {
            reporter_name = reporter_name || req.user.full_name;
            reporter_phone = reporter_phone || req.user.phone || '';
            reporter_role = reporter_role || (req.user.role_name === 'TEACHER' ? 'Giảng viên' : req.user.role_name === 'STUDENT' ? 'Sinh viên' : 'Kỹ thuật viên');
        }
        if (!room_id || !title || !description || !reporter_name) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc' });
        }
        const files = req.files;
        const image_urls = files ? files.map(f => `/uploads/${f.filename}`) : [];
        let newReport;
        try {
            newReport = await sqlDb_1.SqlDatabase.createIncidentReport({
                room_id: parseInt(room_id),
                device_id: device_id ? parseInt(device_id) : null,
                reporter_name,
                reporter_phone: reporter_phone || '',
                reporter_role: reporter_role || 'Giảng viên',
                title,
                description,
                image_urls,
                priority: priority || 'MEDIUM',
                reporter_id: req.user?.id || 1
            });
        }
        catch {
            newReport = db_1.Database.createIncidentReport({
                room_id: parseInt(room_id),
                device_id: device_id ? parseInt(device_id) : null,
                reporter_name,
                reporter_phone: reporter_phone || '',
                reporter_role: reporter_role || 'Giảng viên',
                title,
                description,
                image_urls,
                priority: priority || 'MEDIUM'
            });
        }
        res.json({
            success: true,
            message: 'Gửi báo cáo sự cố thành công! Bộ phận kỹ thuật đã ghi nhận thông tin.',
            data: newReport
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.patch('/incident-reports/:id/status', auth_1.authenticateToken, (0, auth_1.requirePermission)('RESOLVE_REPORTS'), async (req, res) => {
    const reportId = parseInt(req.params.id);
    const { status, technician_name, solution_note } = req.body;
    const tech = technician_name || (req.user ? req.user.full_name : undefined);
    let updated;
    try {
        updated = await sqlDb_1.SqlDatabase.updateIncidentStatus(reportId, status, req.user?.id, tech, solution_note);
    }
    catch {
        updated = db_1.Database.updateIncidentStatus(reportId, status, tech, solution_note);
    }
    if (!updated) {
        return res.status(404).json({ success: false, message: 'Phiếu báo hỏng không tồn tại' });
    }
    res.json({ success: true, message: 'Cập nhật trạng thái thành công', data: updated });
});
// ================= MAINTENANCE LOGS =================
router.get('/maintenance-logs', async (req, res) => {
    try {
        const logs = await sqlDb_1.SqlDatabase.getMaintenanceLogs();
        res.json({ success: true, data: logs });
    }
    catch {
        const logs = db_1.Database.getMaintenanceLogs();
        res.json({ success: true, data: logs });
    }
});
router.post('/maintenance-logs', auth_1.authenticateToken, (0, auth_1.requirePermission)('RESOLVE_REPORTS'), async (req, res) => {
    const { report_id, device_id, technician_name, action_taken, parts_replaced, cost, note } = req.body;
    const tech = technician_name || (req.user ? req.user.full_name : '');
    if (!device_id || !tech || !action_taken) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin bảo trì bắt buộc' });
    }
    let log;
    try {
        log = await sqlDb_1.SqlDatabase.addMaintenanceLog({
            report_id: report_id ? parseInt(report_id) : null,
            device_id: parseInt(device_id),
            technician_name: tech,
            technician_id: req.user?.id,
            action_taken,
            parts_replaced: parts_replaced || '',
            cost: cost ? parseFloat(cost) : 0
        });
    }
    catch {
        log = db_1.Database.addMaintenanceLog({
            report_id: report_id ? parseInt(report_id) : null,
            device_id: parseInt(device_id),
            technician_name: tech,
            action_taken,
            parts_replaced: parts_replaced || '',
            cost: cost ? parseFloat(cost) : 0,
            note
        });
    }
    res.json({ success: true, data: log });
});
// ================= QR CODE GENERATOR =================
router.get('/qr/generate', async (req, res) => {
    try {
        const text = req.query.text;
        if (!text) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số text' });
        }
        const qrDataUrl = await qrcode_1.default.toDataURL(text, {
            width: 300,
            margin: 2,
            color: { dark: '#0284c7', light: '#ffffff' }
        });
        res.json({ success: true, qr_data_url: qrDataUrl });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.default = router;

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import QRCode from 'qrcode';
import { PostgresDatabase } from '../data/postgresDb';
import { authenticateToken, requirePermission, requireRole, optionalAuth, AuthRequest } from './auth';
import { uploadsDirectory } from '../uploads';

const router = Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDirectory),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ================= DASHBOARD & STATS =================
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await PostgresDatabase.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Không thể tải thống kê từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải thống kê. Vui lòng thử lại sau.' });
  }
});

// ================= BUILDINGS & ROOMS =================
router.get('/pois', async (req: Request, res: Response) => {
  try {
    const pois = await PostgresDatabase.getPois();
    res.json({ success: true, data: pois });
  } catch (error) {
    console.error('Không thể tải điểm trên bản đồ từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải điểm trên bản đồ. Vui lòng thử lại sau.' });
  }
});

router.get('/buildings', async (req: Request, res: Response) => {
  try {
    const buildings = await PostgresDatabase.getBuildings();
    res.json({ success: true, data: buildings });
  } catch (error) {
    console.error('Không thể tải danh sách tòa nhà từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải danh sách tòa nhà. Vui lòng thử lại sau.' });
  }
});

router.post('/buildings', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { building_code, name, description, x, y, width, height, floors, color, entrance_x, entrance_y, latitude, longitude } = req.body;
    if (!String(building_code || '').trim() || !String(name || '').trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã và tên tòa nhà' });
    }
    const building = await PostgresDatabase.addBuilding({
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
  } catch (error: any) {
    if (error?.number === 2627 || error?.number === 2601 || /duplicate key|unique key/i.test(String(error?.message || ''))) {
      return res.status(409).json({
        success: false,
        message: `Mã tòa "${String(req.body.building_code || '').trim().toUpperCase()}" đã tồn tại. Vui lòng chọn một mã khác, ví dụ D hoặc E.`
      });
    }
    return res.status(500).json({ success: false, message: error.message || 'Không thể thêm tòa nhà' });
  }
});

router.patch('/buildings/:id', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Mã tòa không hợp lệ' });
  try {
    const building = await PostgresDatabase.updateBuilding(id, req.body);
    if (!building) return res.status(404).json({ success: false, message: 'Tòa/dãy không tồn tại' });
    return res.json({ success: true, data: building });
  } catch (error: any) { return res.status(500).json({ success: false, message: error.message || 'Không thể cập nhật tòa/dãy' }); }
});

router.delete('/buildings/:id', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Mã tòa không hợp lệ' });
  try {
    const deleted = await PostgresDatabase.deleteBuilding(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Tòa/dãy không tồn tại' });
    return res.json({ success: true, message: 'Đã xóa tòa/dãy và các phòng thuộc tòa' });
  } catch (error: any) { return res.status(500).json({ success: false, message: error.message || 'Không thể xóa tòa/dãy' }); }
});

router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const buildingId = req.query.building_id ? parseInt(req.query.building_id as string) : undefined;
    const floor = req.query.floor ? parseInt(req.query.floor as string) : undefined;
    const rooms = await PostgresDatabase.getRooms(buildingId, floor);
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Không thể tải danh sách phòng từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải danh sách phòng. Vui lòng thử lại sau.' });
  }
});

router.get('/rooms/:id', async (req: Request, res: Response) => {
  try {
    const roomId = parseInt(req.params.id);
    const room = await PostgresDatabase.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Phòng học không tồn tại' });
    }
    res.json({ success: true, data: room });
  } catch (error) {
    console.error(`Không thể tải phòng ${req.params.id} từ PostgreSQL:`, error);
    res.status(503).json({ success: false, message: 'Không thể tải thông tin phòng. Vui lòng thử lại sau.' });
  }
});

router.get('/rooms/qr/:qrCode', async (req: Request, res: Response) => {
  try {
    const room = await PostgresDatabase.getRoomByQr(req.params.qrCode);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phòng tương ứng với mã QR' });
    }
    const detailedRoom = await PostgresDatabase.getRoomById(room.id);
    res.json({ success: true, data: detailedRoom });
  } catch (error) {
    console.error(`Không thể tải phòng từ mã QR ${req.params.qrCode}:`, error);
    res.status(503).json({ success: false, message: 'Không thể tải thông tin phòng. Vui lòng thử lại sau.' });
  }
});

router.post('/rooms', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { building_id, room_number, name, floor, qr_code, status, description, x, y, width, height, room_type, door_x, door_y, latitude, longitude } = req.body;
    const newRoom = await PostgresDatabase.addRoom({
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/rooms/:id', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const roomId = parseInt(req.params.id);
    const { building_id, room_number, name, floor, qr_code, status, description, x, y, width, height, room_type, door_x, door_y, latitude, longitude } = req.body;

    const allowedStatuses = ['ACTIVE', 'MAINTENANCE', 'CLOSED'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái phòng không hợp lệ' });
    }

    const updated = await PostgresDatabase.updateRoom(roomId, {
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

    if (!updated) return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/rooms/:id', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.id);
  if (!Number.isInteger(roomId) || roomId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã phòng không hợp lệ' });
  }

  try {
    const deleted = await PostgresDatabase.deleteRoom(roomId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
    }
    return res.json({ success: true, message: 'Đã xóa phòng' });
  } catch (error: any) {
    console.error(`[DELETE /rooms/${roomId}] PostgreSQL deletion failed:`, error);
    return res.status(500).json({
      success: false,
      message: `Không thể xóa phòng trong cơ sở dữ liệu chính. Có thể phòng này vẫn còn liên kết dữ liệu khác. Chi tiết: ${error.message}`
    });
  }
});

// ================= CATEGORIES & DEVICES =================
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await PostgresDatabase.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('Không thể tải danh mục thiết bị từ PostgreSQL:', err);
    res.status(503).json({ success: false, message: 'Không thể tải danh mục thiết bị. Vui lòng thử lại sau.' });
  }
});

router.get('/devices', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
    const status = req.query.status as string | undefined;
    const roomId = req.query.room_id ? parseInt(req.query.room_id as string) : undefined;

    let devices = await PostgresDatabase.getDevices(categoryId, status);
    if (roomId) {
      devices = devices.filter(d => d.room_id === roomId);
    }
    res.json({ success: true, data: devices });
  } catch (err) {
    console.error('Không thể tải thiết bị từ PostgreSQL:', err);
    res.status(503).json({ success: false, message: 'Không thể tải thiết bị. Vui lòng thử lại sau.' });
  }
});

router.get('/devices/:id', async (req: Request, res: Response) => {
  const devId = parseInt(req.params.id);
  try {
    const device = await PostgresDatabase.getDeviceById(devId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
    }
    res.json({ success: true, data: device });
  } catch (err) {
    console.error(`Không thể tải thiết bị ${devId} từ PostgreSQL:`, err);
    res.status(503).json({ success: false, message: 'Không thể tải thông tin thiết bị. Vui lòng thử lại sau.' });
  }
});

router.get('/devices/qr/:qrCode', async (req: Request, res: Response) => {
  try {
    const dev = await PostgresDatabase.getDeviceByQr(req.params.qrCode);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị tương ứng với mã QR' });
    }
    const detailedDev = await PostgresDatabase.getDeviceById(dev.id);
    res.json({ success: true, data: detailedDev });
  } catch (err) {
    console.error(`Không thể tải thiết bị QR ${req.params.qrCode} từ PostgreSQL:`, err);
    res.status(503).json({ success: false, message: 'Không thể tải thông tin thiết bị. Vui lòng thử lại sau.' });
  }
});

router.post('/devices', authenticateToken, requirePermission('MANAGE_DEVICES'), async (req: Request, res: Response) => {
  try {
    const { room_id, category_id, device_code, name, model, serial_number, is_portable, purchase_date, warranty_expiry, specifications } = req.body;
    const qr_code = `QR-DEV-${device_code.toUpperCase()}`;
    const newDevice = await PostgresDatabase.addDevice({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/devices/:id/status', authenticateToken, requirePermission('MANAGE_DEVICES'), async (req: Request, res: Response) => {
  const devId = parseInt(req.params.id);
  const { status } = req.body;
  try {
    const updated = await PostgresDatabase.updateDeviceStatus(devId, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/devices/:id', authenticateToken, requirePermission('MANAGE_DEVICES'), async (req: Request, res: Response) => {
  try {
    const devId = parseInt(req.params.id);
    const { room_id, category_id, device_code, name, model, serial_number, status, is_portable, purchase_date, warranty_expiry, specifications } = req.body;
    const allowedStatuses = ['ACTIVE', 'DAMAGED', 'UNDER_MAINTENANCE', 'LIQUIDATED'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái thiết bị không hợp lệ' });
    }

    const updated = await PostgresDatabase.updateDevice(devId, {
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

    if (!updated) return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/devices/:id', authenticateToken, requirePermission('MANAGE_DEVICES'), async (req: Request, res: Response) => {
  const devId = parseInt(req.params.id);
  try {
    await PostgresDatabase.deleteDevice(devId);
    return res.json({ success: true, message: 'Đã xóa thiết bị' });
  } catch (error: any) {
    console.error(`[DELETE /devices/${devId}] PostgreSQL deletion failed:`, error);
    return res.status(500).json({
      success: false,
      message: `Không thể xóa thiết bị. Có thể thiết bị này vẫn còn liên kết dữ liệu khác. Chi tiết: ${error.message}`
    });
  }
});

// ================= MANUALS & FAQS =================
router.get('/manuals', async (req: Request, res: Response) => {
  try {
    const manuals = await PostgresDatabase.getManuals();
    res.json({ success: true, data: manuals });
  } catch (error) {
    console.error('Không thể tải tài liệu hướng dẫn từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải tài liệu hướng dẫn. Vui lòng thử lại sau.' });
  }
});

router.get('/manuals/:id', async (req: Request, res: Response) => {
  const manualId = parseInt(req.params.id);
  try {
    const manual = await PostgresDatabase.getManualById(manualId);
    if (!manual) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu hướng dẫn' });
    }
    res.json({ success: true, data: manual });
  } catch (error) {
    console.error(`Không thể tải hướng dẫn ${manualId} từ PostgreSQL:`, error);
    res.status(503).json({ success: false, message: 'Không thể tải tài liệu hướng dẫn. Vui lòng thử lại sau.' });
  }
});

router.get('/manuals/device/:deviceId', async (req: Request, res: Response) => {
  const devId = parseInt(req.params.deviceId);
  try {
    const manual = await PostgresDatabase.getManualByDeviceId(devId);
    if (!manual) return res.status(404).json({ success: false, message: 'Chưa có hướng dẫn sử dụng cho thiết bị này' });
    return res.json({ success: true, data: manual });
  } catch (error) {
    console.error(`Không thể tải hướng dẫn cho thiết bị ${devId} từ PostgreSQL:`, error);
    return res.status(503).json({ success: false, message: 'Không thể tải hướng dẫn. Vui lòng thử lại sau.' });
  }
});

// ================= INCIDENT REPORTS (BÁO HỎNG) =================
router.get('/incident-reports/mine', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await PostgresDatabase.getIncidentReports(undefined, undefined, req.user!.id);
    return res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Không thể tải báo hỏng của người dùng từ PostgreSQL:', error);
    return res.status(503).json({ success: false, message: 'Không thể tải phiếu báo hỏng của bạn. Vui lòng thử lại sau.' });
  }
});

router.get('/incident-reports', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const roomId = req.query.room_id ? parseInt(req.query.room_id as string) : undefined;
  try {
    const reports = await PostgresDatabase.getIncidentReports(status, roomId);
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Không thể tải báo hỏng từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải phiếu báo hỏng. Vui lòng thử lại sau.' });
  }
});

router.post('/incident-reports', optionalAuth, upload.array('images', 5), async (req: AuthRequest, res: Response) => {
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

    const files = req.files as Express.Multer.File[] | undefined;
    const image_urls = files ? files.map(f => `/uploads/${f.filename}`) : [];

    const newReport = await PostgresDatabase.createIncidentReport({
      room_id: parseInt(room_id),
      device_id: device_id ? parseInt(device_id) : null,
      reporter_name,
      reporter_phone: reporter_phone || '',
      reporter_role: reporter_role || 'Giảng viên',
      title,
      description,
      image_urls,
      priority: priority || 'MEDIUM',
      reporter_id: req.user?.id
    });

    res.json({
      success: true,
      message: 'Gửi báo cáo sự cố thành công! Bộ phận kỹ thuật đã ghi nhận thông tin.',
      data: newReport
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/incident-reports/:id/status', authenticateToken, requirePermission('RESOLVE_REPORTS'), async (req: AuthRequest, res: Response) => {
  const reportId = parseInt(req.params.id);
  const { status, technician_name, solution_note } = req.body;
  const tech = technician_name || (req.user ? req.user.full_name : undefined);

  try {
    const updated = await PostgresDatabase.updateIncidentStatus(reportId, status, req.user?.id, tech, solution_note);
    if (!updated) return res.status(404).json({ success: false, message: 'Phiếu báo hỏng không tồn tại' });
    return res.json({ success: true, message: 'Cập nhật trạng thái thành công', data: updated });
  } catch (error) {
    console.error(`Không thể cập nhật phiếu báo hỏng ${reportId} trong PostgreSQL:`, error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật phiếu báo hỏng' });
  }
});

// ================= MAINTENANCE LOGS =================
router.get('/maintenance-logs', async (req: Request, res: Response) => {
  try {
    const logs = await PostgresDatabase.getMaintenanceLogs();
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Không thể tải nhật ký bảo trì từ PostgreSQL:', error);
    res.status(503).json({ success: false, message: 'Không thể tải nhật ký bảo trì. Vui lòng thử lại sau.' });
  }
});

router.post('/maintenance-logs', authenticateToken, requirePermission('RESOLVE_REPORTS'), async (req: AuthRequest, res: Response) => {
  const { report_id, device_id, technician_name, action_taken, parts_replaced, cost, note } = req.body;
  const tech = technician_name || (req.user ? req.user.full_name : '');
  if (!device_id || !tech || !action_taken) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin bảo trì bắt buộc' });
  }

  try {
    const log = await PostgresDatabase.addMaintenanceLog({
      report_id: report_id ? parseInt(report_id) : null,
      device_id: parseInt(device_id),
      technician_name: tech,
      technician_id: req.user?.id,
      action_taken,
      parts_replaced: parts_replaced || '',
      cost: cost ? parseFloat(cost) : 0
    });
    return res.json({ success: true, data: log });
  } catch (error) {
    console.error('Không thể tạo nhật ký bảo trì trong PostgreSQL:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu nhật ký bảo trì' });
  }
});

// ================= QR CODE GENERATOR =================
router.get('/qr/generate', async (req: Request, res: Response) => {
  try {
    const text = req.query.text as string;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số text' });
    }
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: { dark: '#0284c7', light: '#ffffff' }
    });
    res.json({ success: true, qr_data_url: qrDataUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

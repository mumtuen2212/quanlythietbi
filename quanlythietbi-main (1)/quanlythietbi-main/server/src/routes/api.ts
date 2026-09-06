import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import QRCode from 'qrcode';
import { Database } from '../data/db';
import { authenticateToken, requirePermission, optionalAuth, AuthRequest } from './auth';

const router = Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
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
router.get('/stats', (req: Request, res: Response) => {
  const stats = Database.getDashboardStats();
  res.json({ success: true, data: stats });
});

// ================= BUILDINGS & ROOMS =================
router.get('/pois', (req: Request, res: Response) => {
  const pois = Database.getPois();
  res.json({ success: true, data: pois });
});

router.get('/buildings', (req: Request, res: Response) => {
  const buildings = Database.getBuildings();
  res.json({ success: true, data: buildings });
});

router.get('/rooms', (req: Request, res: Response) => {
  const buildingId = req.query.building_id ? parseInt(req.query.building_id as string) : undefined;
  const floor = req.query.floor ? parseInt(req.query.floor as string) : undefined;
  const rooms = Database.getRooms(buildingId, floor);
  res.json({ success: true, data: rooms });
});

router.get('/rooms/:id', (req: Request, res: Response) => {
  const roomId = parseInt(req.params.id);
  const room = Database.getRoomById(roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Phòng học không tồn tại' });
  }
  res.json({ success: true, data: room });
});

router.get('/rooms/qr/:qrCode', (req: Request, res: Response) => {
  const room = Database.getRoomByQr(req.params.qrCode);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy phòng tương ứng với mã QR' });
  }
  const detailedRoom = Database.getRoomById(room.id);
  res.json({ success: true, data: detailedRoom });
});

// ================= CATEGORIES & DEVICES =================
router.get('/categories', (req: Request, res: Response) => {
  const categories = Database.getCategories();
  res.json({ success: true, data: categories });
});

router.get('/devices', (req: Request, res: Response) => {
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
  const status = req.query.status as string | undefined;
  const roomId = req.query.room_id ? parseInt(req.query.room_id as string) : undefined;

  let devices = Database.getDevices(categoryId, status);
  if (roomId) {
    devices = devices.filter(d => d.room_id === roomId);
  }

  res.json({ success: true, data: devices });
});

router.get('/devices/:id', (req: Request, res: Response) => {
  const devId = parseInt(req.params.id);
  const device = Database.getDeviceById(devId);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
  }
  res.json({ success: true, data: device });
});

router.get('/devices/qr/:qrCode', (req: Request, res: Response) => {
  const dev = Database.getDeviceByQr(req.params.qrCode);
  if (!dev) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị tương ứng với mã QR' });
  }
  const detailedDev = Database.getDeviceById(dev.id);
  res.json({ success: true, data: detailedDev });
});

router.post('/devices', authenticateToken, requirePermission('MANAGE_DEVICES'), (req: Request, res: Response) => {
  try {
    const { room_id, category_id, device_code, name, model, serial_number, is_portable, purchase_date, warranty_expiry, specifications } = req.body;
    const qr_code = `QR-DEV-${device_code.toUpperCase()}`;
    const newDevice = Database.addDevice({
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

router.patch('/devices/:id/status', authenticateToken, requirePermission('MANAGE_DEVICES'), (req: Request, res: Response) => {
  const devId = parseInt(req.params.id);
  const { status } = req.body;
  const updated = Database.updateDeviceStatus(devId, status);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
  }
  res.json({ success: true, data: updated });
});

router.patch('/devices/:id', authenticateToken, requirePermission('MANAGE_DEVICES'), (req: Request, res: Response) => {
  try {
    const devId = parseInt(req.params.id);
    const { room_id, category_id, device_code, name, model, serial_number, status, is_portable, purchase_date, warranty_expiry, specifications } = req.body;
    const allowedStatuses = ['ACTIVE', 'DAMAGED', 'UNDER_MAINTENANCE', 'LIQUIDATED'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái thiết bị không hợp lệ' });
    }

    const updated = Database.updateDevice(devId, {
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

router.delete('/devices/:id', authenticateToken, requirePermission('MANAGE_DEVICES'), (req: Request, res: Response) => {
  const deleted = Database.deleteDevice(parseInt(req.params.id));
  if (!deleted) return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
  return res.json({ success: true, message: 'Đã xóa thiết bị' });
});

// ================= MANUALS & FAQS =================
router.get('/manuals', (req: Request, res: Response) => {
  const manuals = Database.getManuals();
  res.json({ success: true, data: manuals });
});

router.get('/manuals/:id', (req: Request, res: Response) => {
  const manualId = parseInt(req.params.id);
  const manual = Database.getManualById(manualId);
  if (!manual) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu hướng dẫn' });
  }
  res.json({ success: true, data: manual });
});

router.get('/manuals/device/:deviceId', (req: Request, res: Response) => {
  const devId = parseInt(req.params.deviceId);
  const device = Database.getDeviceById(devId);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
  }
  const manual = Database.getManualByDeviceId(devId) || Database.getManualByCategoryId(device.category_id);
  if (!manual) {
    return res.status(404).json({ success: false, message: 'Chưa có hướng dẫn sử dụng cho thiết bị này' });
  }
  res.json({ success: true, data: manual });
});

// ================= INCIDENT REPORTS (BÁO HỎNG) =================
router.get('/incident-reports', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const roomId = req.query.room_id ? parseInt(req.query.room_id as string) : undefined;
  const reports = Database.getIncidentReports(status, roomId);
  res.json({ success: true, data: reports });
});

router.post('/incident-reports', optionalAuth, upload.array('images', 5), (req: AuthRequest, res: Response) => {
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

    const newReport = Database.createIncidentReport({
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

    res.json({
      success: true,
      message: 'Gửi báo cáo sự cố thành công! Bộ phận kỹ thuật đã ghi nhận thông tin.',
      data: newReport
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/incident-reports/:id/status', authenticateToken, requirePermission('RESOLVE_REPORTS'), (req: AuthRequest, res: Response) => {
  const reportId = parseInt(req.params.id);
  const { status, technician_name, solution_note } = req.body;

  const tech = technician_name || (req.user ? req.user.full_name : undefined);
  const updated = Database.updateIncidentStatus(reportId, status, tech, solution_note);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Phiếu báo hỏng không tồn tại' });
  }

  // If resolved and note given, automatically log maintenance
  if (status === 'RESOLVED' && updated.device_id) {
    Database.addMaintenanceLog({
      report_id: reportId,
      device_id: updated.device_id,
      technician_name: tech || 'Kỹ thuật viên CSVC',
      action_taken: solution_note || 'Đã sửa chữa và kiểm tra hoạt động ổn định',
      parts_replaced: '',
      cost: 0,
      note: 'Xử lý hoàn tất từ phiếu báo hỏng ' + updated.report_code
    });
  }

  res.json({ success: true, message: 'Cập nhật trạng thái thành công', data: updated });
});

// ================= MAINTENANCE LOGS =================
router.get('/maintenance-logs', (req: Request, res: Response) => {
  const logs = Database.getMaintenanceLogs();
  res.json({ success: true, data: logs });
});

router.post('/maintenance-logs', authenticateToken, requirePermission('RESOLVE_REPORTS'), (req: AuthRequest, res: Response) => {
  const { report_id, device_id, technician_name, action_taken, parts_replaced, cost, note } = req.body;
  const tech = technician_name || (req.user ? req.user.full_name : '');
  if (!device_id || !tech || !action_taken) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin bảo trì bắt buộc' });
  }
  const log = Database.addMaintenanceLog({
    report_id: report_id ? parseInt(report_id) : null,
    device_id: parseInt(device_id),
    technician_name: tech,
    action_taken,
    parts_replaced: parts_replaced || '',
    cost: cost ? parseFloat(cost) : 0,
    note
  });
  res.json({ success: true, data: log });
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

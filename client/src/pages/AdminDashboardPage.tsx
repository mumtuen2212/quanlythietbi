import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  AlertTriangle, 
  Cpu, 
  Wrench, 
  CheckCircle2, 
  Plus, 
  Clock, 
  UserCheck, 
  QrCode,
  Sparkles,
  Building2
} from 'lucide-react';
import { ApiService } from '../services/api';
import { IncidentReport, Device, MaintenanceLog, Room, DeviceCategory } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'devices' | 'logs'>('reports');

  // Data
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution Modal State
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [techName, setTechName] = useState('KTV. Trần Minh Quang');
  const [solutionNote, setSolutionNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');

  // New Device Form State
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    room_id: '',
    category_id: '1',
    device_code: '',
    name: '',
    model: '',
    serial_number: '',
    warranty_expiry: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [reportsData, devicesData, roomsData, catData, logsData] = await Promise.all([
        ApiService.getIncidentReports(),
        ApiService.getDevices(),
        ApiService.getRooms(),
        ApiService.getCategories(),
        ApiService.getMaintenanceLogs()
      ]);
      setReports(reportsData);
      setDevices(devicesData);
      setRooms(roomsData);
      setCategories(catData);
      setLogs(logsData);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      await ApiService.updateIncidentStatus(selectedReport.id, {
        status: newStatus,
        technician_name: techName,
        solution_note: solutionNote
      });
      setSelectedReport(null);
      setSolutionNote('');
      await loadAllData();
    } catch (err) {
      console.error('Error updating report status:', err);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiService.createDevice(newDevice);
      setShowAddDeviceModal(false);
      setNewDevice({
        room_id: '',
        category_id: '1',
        device_code: '',
        name: '',
        model: '',
        serial_number: '',
        warranty_expiry: ''
      });
      await loadAllData();
    } catch (err) {
      console.error('Error creating device:', err);
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-sky-600" />
            <span>Kỹ Thuật Viên & Quản Trị CSVC</span>
          </h1>
          <p className="text-slate-500 text-sm">Xử lý báo hỏng, theo dõi bảo trì và quản lý vòng đời thiết bị trường học</p>
        </div>

        <button
          onClick={() => setShowAddDeviceModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Thiết Bị Mới</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'reports'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Phiếu Báo Hỏng Cần Xử Lý ({reports.filter(r => r.status !== 'RESOLVED').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'devices'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Danh Sách Thiết Bị ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'logs'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Nhật Ký Bảo Trì & Sửa Chữa ({logs.length})</span>
        </button>
      </div>

      {/* Tab Content 1: Reports Management */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              Hiện không có phiếu báo hỏng nào.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div
                  key={report.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                        {report.report_code}
                      </span>
                      <StatusBadge status={report.status} size="sm" />
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Ưu tiên: {report.priority}
                      </span>
                      <span className="text-xs text-slate-400">• {report.created_at}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{report.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {report.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>📍 Phòng: <strong className="text-slate-800">{report.room_name}</strong></span>
                      <span>⚙️ Thiết bị: <strong className="text-slate-800">{report.device_name || 'Phòng'}</strong></span>
                      <span>👤 Người báo: <strong className="text-slate-800">{report.reporter_name} ({report.reporter_phone})</strong></span>
                    </div>

                    {report.solution_note && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">
                        ✅ KTV ghi chú: {report.solution_note} ({report.assigned_technician_name})
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex sm:flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setNewStatus(report.status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS');
                        setSolutionNote(report.solution_note || '');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Cập nhật tiến độ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Devices Table */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Mã Thiết Bị</th>
                  <th className="px-5 py-4">Tên Thiết Bị</th>
                  <th className="px-5 py-4">Vị Trí Phòng</th>
                  <th className="px-5 py-4">Danh Mục</th>
                  <th className="px-5 py-4">Trạng Thái</th>
                  <th className="px-5 py-4 text-right">Mã QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map(dev => (
                  <tr key={dev.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-mono font-bold text-sky-700">{dev.device_code}</td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{dev.name}</p>
                      <p className="text-[11px] text-slate-400">Model: {dev.model || 'N/A'}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{dev.room_name}</td>
                    <td className="px-5 py-4">{dev.category_name}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={dev.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-[11px] text-slate-500">
                      {dev.qr_code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Maintenance Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-800">KTV Phụ trách: {log.technician_name}</span>
                <span>{log.performed_at}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">Thiết bị: {log.device_name}</p>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{log.action_taken}</p>
              {log.parts_replaced && (
                <p className="text-xs text-slate-600">
                  <span className="font-semibold">Vật tư thay thế:</span> {log.parts_replaced}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution Update Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in">
            <h3 className="text-lg font-extrabold text-slate-900">Cập nhật Trạng thái Xử lý</h3>
            <p className="text-xs text-slate-500">Phiếu: <strong>{selectedReport.report_code}</strong> ({selectedReport.title})</p>

            <form onSubmit={handleUpdateReport} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Trạng thái xử lý *</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  <option value="ASSIGNED">Đã tiếp nhận (Assigned)</option>
                  <option value="IN_PROGRESS">Đang sửa chữa (In Progress)</option>
                  <option value="RESOLVED">Đã hoàn tất / Sửa xong (Resolved)</option>
                  <option value="CANCELLED">Hủy bỏ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Kỹ thuật viên thực hiện *</label>
                <input
                  type="text"
                  value={techName}
                  onChange={e => setTechName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Ghi chú giải pháp / Linh kiện đã thay</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Đã thay 2 pin AA mới và căn chỉnh tần số mic Sisu xanh..."
                  value={solutionNote}
                  onChange={e => setSolutionNote(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors"
                >
                  Lưu cập nhật
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in">
            <h3 className="text-lg font-extrabold text-slate-900">Thêm Thiết Bị Mới Vào Hệ Thống</h3>

            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tên thiết bị *</label>
                <input
                  type="text"
                  placeholder="Vd: Bộ Micro không dây Sisu màu xanh"
                  value={newDevice.name}
                  onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Mã thiết bị *</label>
                  <input
                    type="text"
                    placeholder="MIC-A301-02"
                    value={newDevice.device_code}
                    onChange={e => setNewDevice({ ...newDevice, device_code: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Phòng học</label>
                  <select
                    value={newDevice.room_id}
                    onChange={e => setNewDevice({ ...newDevice, room_id: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">Kho CSVC</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Phòng {r.room_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Danh mục thiết bị</label>
                <select
                  value={newDevice.category_id}
                  onChange={e => setNewDevice({ ...newDevice, category_id: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700"
                >
                  Thêm thiết bị
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

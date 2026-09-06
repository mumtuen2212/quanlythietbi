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
  Building2,
  ShieldCheck,
  Users,
  Save,
  KeyRound,
  Check,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { ApiService } from '../services/api';
import { 
  IncidentReport, 
  Device, 
  MaintenanceLog, 
  Room, 
  DeviceCategory,
  User,
  Permission,
  RoleName,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  DEFAULT_ROLE_PERMISSIONS
} from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'devices' | 'logs' | 'permissions'>('reports');

  // Data
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userMsg, setUserMsg] = useState<{ id: number; text: string; error?: boolean } | null>(null);
  const [userModal, setUserModal] = useState<{ mode: 'create' | 'edit'; user?: User } | null>(null);
  const [userForm, setUserForm] = useState({
    username: '', password: '', full_name: '', email: '', phone: '', role_name: 'TECHNICIAN' as RoleName
  });

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
    warranty_expiry: '',
    status: 'ACTIVE' as Device['status']
  });
  const [deviceModal, setDeviceModal] = useState<{ mode: 'create' | 'edit'; device?: Device } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadUsersData = async () => {
    try {
      setUsersLoading(true);
      const users = await ApiService.getUsers();
      setUsersList(users);
    } catch (err) {
      console.warn('Cannot load users (may require admin permissions):', err);
    } finally {
      setUsersLoading(false);
    }
  };

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
      loadUsersData();
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (userId: number, perm: Permission) => {
    setUsersList(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const currentPerms = u.permissions || [];
      const hasPerm = currentPerms.includes(perm);
      const nextPerms = hasPerm
        ? currentPerms.filter(p => p !== perm)
        : [...currentPerms, perm];
      return { ...u, permissions: nextPerms };
    }));
  };

  const handleChangeUserRole = (userId: number, newRole: RoleName) => {
    setUsersList(prev => prev.map(u => {
      if (u.id !== userId) return u;
      return { 
        ...u, 
        role_name: newRole,
        permissions: DEFAULT_ROLE_PERMISSIONS[newRole] || []
      };
    }));
  };

  const handleSaveUserPermissions = async (u: User) => {
    try {
      setUserMsg(null);
      await ApiService.updateUserPermissions(u.id, u.permissions, u.role_name);
      setUserMsg({ id: u.id, text: 'Đã lưu phân quyền thành công!' });
      setTimeout(() => setUserMsg(null), 3000);
    } catch (err: any) {
      setUserMsg({ 
        id: u.id, 
        text: err.response?.data?.message || 'Lỗi khi cập nhật quyền.', 
        error: true 
      });
    }
  };

  const openCreateUser = () => {
    setUserForm({ username: '', password: '', full_name: '', email: '', phone: '', role_name: 'TECHNICIAN' });
    setUserModal({ mode: 'create' });
  };

  const openEditUser = (u: User) => {
    setUserForm({ username: u.username, password: '', full_name: u.full_name, email: u.email, phone: u.phone || '', role_name: u.role_name });
    setUserModal({ mode: 'edit', user: u });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userModal?.mode === 'create') {
        const created = await ApiService.createUser(userForm);
        setUsersList(prev => [...prev, created]);
      } else if (userModal?.user) {
        const { username: _username, password, ...editableFields } = userForm;
        const updated = await ApiService.updateUser(userModal.user.id, {
          ...editableFields,
          ...(password ? { password } : {})
        });
        setUsersList(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      }
      setUserModal(null);
      setUserMsg({ id: userModal?.user?.id || 0, text: 'Đã lưu tài khoản thành công!' });
    } catch (err: any) {
      setUserMsg({ id: userModal?.user?.id || 0, text: err.response?.data?.message || 'Lỗi khi lưu tài khoản.', error: true });
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Xóa tài khoản ${u.full_name}?`)) return;
    try {
      await ApiService.deleteUser(u.id);
      setUsersList(prev => prev.filter(item => item.id !== u.id));
    } catch (err: any) {
      setUserMsg({ id: u.id, text: err.response?.data?.message || 'Lỗi khi xóa tài khoản.', error: true });
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
      if (deviceModal?.mode === 'edit' && deviceModal.device) {
        const updated = await ApiService.updateDevice(deviceModal.device.id, {
          room_id: newDevice.room_id ? Number(newDevice.room_id) : null,
          category_id: Number(newDevice.category_id),
          device_code: newDevice.device_code,
          name: newDevice.name,
          model: newDevice.model,
          serial_number: newDevice.serial_number,
          warranty_expiry: newDevice.warranty_expiry,
          status: newDevice.status
        });
        setDevices(prev => prev.map(device => device.id === updated.id ? { ...device, ...updated } : device));
      } else {
        await ApiService.createDevice(newDevice);
        await loadAllData();
      }
      setShowAddDeviceModal(false);
      setDeviceModal(null);
      setNewDevice({
        room_id: '',
        category_id: '1',
        device_code: '',
        name: '',
        model: '',
        serial_number: '',
        warranty_expiry: '',
        status: 'ACTIVE'
      });
    } catch (err) {
      console.error('Error creating device:', err);
    }
  };

  const openEditDevice = (device: Device) => {
    setNewDevice({
      room_id: device.room_id ? String(device.room_id) : '',
      category_id: String(device.category_id),
      device_code: device.device_code,
      name: device.name,
      model: device.model || '',
      serial_number: device.serial_number || '',
      warranty_expiry: device.warranty_expiry || '',
      status: device.status
    });
    setDeviceModal({ mode: 'edit', device });
    setShowAddDeviceModal(true);
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!window.confirm(`Xóa thiết bị ${device.name}?`)) return;
    try {
      await ApiService.deleteDevice(device.id);
      setDevices(prev => prev.filter(item => item.id !== device.id));
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Không thể xóa thiết bị.');
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
          onClick={() => {
            setDeviceModal({ mode: 'create' });
            setShowAddDeviceModal(true);
          }}
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
          <span>Nhật Ký Bảo Trì ({logs.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('permissions');
            loadUsersData();
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'permissions'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Cấp Quyền & RBAC ({usersList.length || 4})</span>
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
                  {hasPermission('MANAGE_DEVICES') && <th className="px-5 py-4 text-right">Thao tác</th>}
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
                    {hasPermission('MANAGE_DEVICES') && (
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button type="button" onClick={() => openEditDevice(dev)} title="Sửa thiết bị" className="inline-flex p-2 rounded-lg text-sky-700 hover:bg-sky-50">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteDevice(dev)} title="Xóa thiết bị" className="inline-flex p-2 rounded-lg text-rose-600 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
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

      {/* Tab Content 4: RBAC & Permissions Management */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                <span>Bảng Phân Quyền Truy Cập Hệ Thống (RBAC)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý quyền hạn cho từng tài khoản: Admin có toàn quyền, Kỹ thuật viên xử lý sự cố & thiết bị, Giảng viên & Sinh viên gửi báo hỏng.
              </p>
            </div>

            <button
              onClick={loadUsersData}
              disabled={usersLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới danh sách</span>
            </button>
            {hasPermission('GRANT_PERMISSIONS') && (
              <button
                onClick={openCreateUser}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm kỹ thuật viên</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold">
                    <th className="py-4 px-5 min-w-[200px]">Người Dùng</th>
                    <th className="py-4 px-5 min-w-[150px]">Vai Trò (Role)</th>
                    <th className="py-4 px-5 min-w-[320px]">Quyền Hạn Chi Tiết (Permissions)</th>
                    <th className="py-4 px-5 text-right min-w-[130px]">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map(u => {
                    const isSaving = userMsg?.id === u.id;
                    const isSuccess = isSaving && !userMsg?.error;
                    const isError = isSaving && userMsg?.error;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* User info */}
                        <td className="py-4 px-5">
                          <div className="font-black text-slate-900 text-sm">{u.full_name}</div>
                          <div className="text-slate-500 font-mono text-[11px]">@{u.username}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{u.email}</div>
                          {u.phone && <div className="text-slate-400 text-[11px]">{u.phone}</div>}
                        </td>

                        {/* Role selector */}
                        <td className="py-4 px-5">
                          <select
                            value={u.role_name}
                            onChange={e => handleChangeUserRole(u.id, e.target.value as RoleName)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm"
                          >
                            <option value="ADMIN">Quản Trị Viên (Admin)</option>
                            <option value="TECHNICIAN">Kỹ Thuật Viên (KTV)</option>
                            <option value="TEACHER">Giảng Viên (Teacher)</option>
                            <option value="STUDENT">Sinh Viên (Student)</option>
                          </select>
                          <div className="mt-1">
                            <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              u.role_name === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : u.role_name === 'TECHNICIAN'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : u.role_name === 'TEACHER'
                                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role_name}
                            </span>
                          </div>
                        </td>

                        {/* Permissions Checkbox Matrix */}
                        <td className="py-4 px-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {ALL_PERMISSIONS.map(perm => {
                              const checked = (u.permissions || []).includes(perm) || u.role_name === 'ADMIN';
                              const isDisabled = u.role_name === 'ADMIN'; // Admin has all permissions by default

                              return (
                                <label
                                  key={perm}
                                  className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                                    checked
                                      ? 'bg-sky-50/70 border-sky-200 text-sky-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                  } ${isDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isDisabled}
                                    onChange={() => handleTogglePermission(u.id, perm)}
                                    className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                                  />
                                  <span className="truncate">{PERMISSION_LABELS[perm]}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveUserPermissions(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/25 transition-all cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu quyền</span>
                          </button>

                          {hasPermission('GRANT_PERMISSIONS') && (
                            <div className="flex justify-end gap-1 mt-2">
                              <button type="button" onClick={() => openEditUser(u)} title="Sửa tài khoản" className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-50">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => handleDeleteUser(u)} title="Xóa tài khoản" className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {userMsg?.id === u.id && (
                            <div className={`text-[11px] font-bold mt-1.5 ${userMsg.error ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {userMsg.text}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
            <h3 className="text-lg font-extrabold text-slate-900">{deviceModal?.mode === 'edit' ? 'Sửa thông tin thiết bị' : 'Thêm Thiết Bị Mới Vào Hệ Thống'}</h3>

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

              <div>
                <label className="text-xs font-bold text-slate-700">Model</label>
                <input
                  value={newDevice.model}
                  onChange={e => setNewDevice({ ...newDevice, model: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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

              <div>
                <label className="text-xs font-bold text-slate-700">Trạng thái</label>
                <select
                  value={newDevice.status}
                  onChange={e => setNewDevice({ ...newDevice, status: e.target.value as Device['status'] })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="ACTIVE">Hoạt động tốt</option>
                  <option value="DAMAGED">Đang báo hỏng</option>
                  <option value="UNDER_MAINTENANCE">Đang bảo trì</option>
                  <option value="LIQUIDATED">Đã thanh lý</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700"
                >
                  {deviceModal?.mode === 'edit' ? 'Lưu thay đổi' : 'Thêm thiết bị'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDeviceModal(false);
                    setDeviceModal(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">{userModal.mode === 'create' ? 'Thêm kỹ thuật viên' : 'Sửa tài khoản'}</h3>
              <button type="button" onClick={() => setUserModal(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Đóng"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-3">
              {userModal.mode === 'create' && (
                <div>
                  <label className="text-xs font-bold text-slate-700">Tên đăng nhập *</label>
                  <input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required minLength={3} />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700">Họ tên *</label>
                <input value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Email *</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Số điện thoại</label>
                  <input value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Vai trò</label>
                  <select value={userForm.role_name} onChange={e => setUserForm({ ...userForm, role_name: e.target.value as RoleName })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <option value="TECHNICIAN">Kỹ thuật viên</option>
                    <option value="TEACHER">Giảng viên</option>
                    <option value="STUDENT">Sinh viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">{userModal.mode === 'create' ? 'Mật khẩu *' : 'Mật khẩu mới'}</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required={userModal.mode === 'create'} minLength={6} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700">Lưu tài khoản</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

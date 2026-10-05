import React, { useEffect, useRef, useState } from 'react';
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
  MapPin,
  X,
  Search
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
  DEFAULT_ROLE_PERMISSIONS,
  Building
} from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { FloorPlanMap } from '../components/FloorPlanMap';
import { LeafletCampusMap } from '../components/LeafletCampusMap';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser, hasPermission, refreshUser } = useAuth();
  const isAdmin = currentUser?.role_name === 'ADMIN';
  const isReporter = currentUser?.role_name === 'TEACHER' || currentUser?.role_name === 'STUDENT';
  const canManageDevices = hasPermission('MANAGE_DEVICES');
  const canSeeRoomsTab = hasPermission('MANAGE_ROOMS');
  const canManageRoomCrud = canSeeRoomsTab;
  const canViewReports = isReporter || hasPermission('VIEW_REPORTS') || hasPermission('RESOLVE_REPORTS') || hasPermission('ASSIGN_REPORTS');
  const canResolveReports = hasPermission('RESOLVE_REPORTS');
  const canViewLogs = canResolveReports;
  // Tài khoản Admin (bao gồm Admin cấp 1) luôn có quyền quản lý các tài khoản khác.
  const canManageAccounts = isAdmin || hasPermission('GRANT_PERMISSIONS');
  const [activeTab, setActiveTab] = useState<'reports' | 'devices' | 'rooms' | 'logs' | 'permissions'>('reports');

  // Data
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [mySubmittedReports, setMySubmittedReports] = useState<IncidentReport[]>([]);
  const [reportListView, setReportListView] = useState<'all' | 'mine'>('all');
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicePage, setDevicePage] = useState(1);
  const [buildingPage, setBuildingPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [reportSearch, setReportSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [buildingSearch, setBuildingSearch] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userMsg, setUserMsg] = useState<{ id: number; text: string; error?: boolean } | null>(null);
  const [savingRoleUserId, setSavingRoleUserId] = useState<number | null>(null);
  const [userModal, setUserModal] = useState<{ mode: 'create' | 'edit'; user?: User } | null>(null);
  const [userForm, setUserForm] = useState({
    username: '', password: '', full_name: '', email: '', phone: '', role_name: 'TECHNICIAN' as RoleName
  });

  // Resolution Modal State
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [selectedReportImage, setSelectedReportImage] = useState<{ url: string; reportCode: string } | null>(null);
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

  // Rooms CRUD State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showBuildingManager, setShowBuildingManager] = useState(false);
  const [managementSection, setManagementSection] = useState<'buildings' | 'rooms'>('rooms');
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [showBuildingMapPicker, setShowBuildingMapPicker] = useState(false);
  const [showRoomMapPicker, setShowRoomMapPicker] = useState(false);
  const [buildingLoadError, setBuildingLoadError] = useState(false);
  const [roomModal, setRoomModal] = useState<{ mode: 'create' | 'edit'; room?: Room } | null>(null);
  const [roomForm, setRoomForm] = useState({
    building_id: '1',
    room_number: '',
    name: '',
    floor: '1',
    qr_code: '',
    status: 'ACTIVE' as Room['status'],
    description: '',
    x: '0',
    y: '0',
    width: '180',
    height: '120',
    room_type: 'CLASSROOM' as Room['room_type'],
    door_x: '50',
    door_y: '50',
    latitude: '',
    longitude: ''
  });
  const [buildingForm, setBuildingForm] = useState({
    building_code: '', name: '', description: '', floors: '1', color: '#2563eb',
    x: '500', y: '350', width: '200', height: '140', entrance_x: '500', entrance_y: '350', latitude: '', longitude: ''
  });

  const didLoadInitialDataRef = useRef(false);

  useEffect(() => {
    if (didLoadInitialDataRef.current) return;
    didLoadInitialDataRef.current = true;
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports' && !canViewReports) setActiveTab(canManageDevices ? 'devices' : canSeeRoomsTab ? 'rooms' : 'logs');
    if (activeTab === 'devices' && !canManageDevices) setActiveTab(canViewReports ? 'reports' : canSeeRoomsTab ? 'rooms' : 'logs');
    if (activeTab === 'rooms' && !canSeeRoomsTab) setActiveTab(canManageDevices ? 'devices' : canViewReports ? 'reports' : 'logs');
    if (activeTab === 'logs' && !canViewLogs) setActiveTab(canManageDevices ? 'devices' : canViewReports ? 'reports' : 'rooms');
    if (activeTab === 'permissions' && !canManageAccounts) setActiveTab(canManageDevices ? 'devices' : canViewReports ? 'reports' : 'logs');
  }, [activeTab, canManageAccounts, canManageDevices, canSeeRoomsTab, canViewLogs, canViewReports]);

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

  // Buildings are required for the room form. Keep this request independent so
  // an unrelated dashboard request cannot make the building selector empty.
  const loadBuildingsData = async () => {
    try {
      const buildingsData = await ApiService.getBuildings();
      setBuildings(buildingsData);
      setBuildingLoadError(false);
      return buildingsData;
    } catch (err) {
      console.error('Cannot load buildings:', err);
      setBuildingLoadError(true);
      return [];
    }
  };

  const loadAllData = async () => {
    const buildingsRequest = loadBuildingsData();
    try {
      setLoading(true);
      const [reportsData, ownReportsData, devicesData, roomsData, catData, logsData] = await Promise.all([
        ApiService.getIncidentReports(),
        isReporter ? ApiService.getMyIncidentReports() : Promise.resolve([] as IncidentReport[]),
        ApiService.getDevices(),
        ApiService.getRooms(),
        ApiService.getCategories(),
        ApiService.getMaintenanceLogs()
      ]);
      setReports(reportsData);
      setMySubmittedReports(ownReportsData);
      setDevices(devicesData);
      setRooms(roomsData);
      setCategories(catData);
      setLogs(logsData);
      loadUsersData();
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      await buildingsRequest;
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

  const handleChangeUserRole = async (userId: number, newRole: RoleName) => {
    const previousUser = usersList.find(u => u.id === userId);
    if (!previousUser || previousUser.role_name === newRole) return;

    // Khi đổi vai trò, quyền mặc định của vai trò đó được áp dụng và lưu ngay.
    const nextPermissions = [...(DEFAULT_ROLE_PERMISSIONS[newRole] || [])];
    setUsersList(prev => prev.map(u => u.id === userId
      ? { ...u, role_name: newRole, permissions: nextPermissions }
      : u
    ));
    setSavingRoleUserId(userId);
    setUserMsg({ id: userId, text: 'Đang áp dụng quyền theo vai trò...' });

    try {
      const savedUser = await ApiService.updateUserPermissions(userId, nextPermissions, newRole);
      setUsersList(prev => prev.map(u => u.id === userId ? savedUser : u));
      if (currentUser?.id === userId) await refreshUser();
      setUserMsg({ id: userId, text: 'Đã lưu vai trò và quyền mặc định.' });
      setTimeout(() => setUserMsg(null), 3000);
    } catch (err: any) {
      setUsersList(prev => prev.map(u => u.id === userId ? previousUser : u));
      setUserMsg({
        id: userId,
        text: err.response?.data?.message || 'Không thể cập nhật vai trò.',
        error: true
      });
    } finally {
      setSavingRoleUserId(null);
    }
  };

  const handleSaveUserPermissions = async (u: User) => {
    try {
      setUserMsg(null);
      await ApiService.updateUserPermissions(u.id, u.permissions, u.role_name);
      if (currentUser && u.id === currentUser.id) {
        await refreshUser();
      }
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
      await loadUsersData();
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
      await loadAllData();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Không thể xóa thiết bị.');
    }
  };

  const openCreateRoom = () => {
    setShowRoomMapPicker(false);
    setRoomForm({
      building_id: '1',
      room_number: '',
      name: '',
      floor: '1',
      qr_code: '',
      status: 'ACTIVE',
      description: '',
      x: '40',
      y: '40',
      width: '180',
      height: '120',
      room_type: 'CLASSROOM',
      door_x: '50',
      door_y: '50',
      latitude: '',
      longitude: ''
    });
    setRoomModal({ mode: 'create' });
    setShowRoomModal(true);
  };

  const openCreateBuilding = () => {
    setEditingBuilding(null);
    setShowBuildingMapPicker(false);
    setBuildingForm({ building_code: '', name: '', description: '', floors: '1', color: '#2563eb', x: '500', y: '350', width: '200', height: '140', entrance_x: '500', entrance_y: '350', latitude: '', longitude: '' });
    setShowBuildingModal(true);
  };

  const openEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setShowBuildingMapPicker(false);
    setBuildingForm({ building_code: building.building_code, name: building.name, description: building.description || '', floors: String(building.floors), color: building.color, x: String(building.x), y: String(building.y), width: String(building.width), height: String(building.height), entrance_x: String(building.entrance_x), entrance_y: String(building.entrance_y), latitude: building.latitude == null ? '' : String(building.latitude), longitude: building.longitude == null ? '' : String(building.longitude) });
    setShowBuildingManager(false);
    setShowBuildingModal(true);
  };

  const handleSaveBuilding = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        building_code: buildingForm.building_code,
        name: buildingForm.name,
        description: buildingForm.description,
        floors: Number(buildingForm.floors),
        color: buildingForm.color,
        x: Number(buildingForm.x),
        y: Number(buildingForm.y),
        width: Number(buildingForm.width),
        height: Number(buildingForm.height),
        entrance_x: Number(buildingForm.entrance_x),
        entrance_y: Number(buildingForm.entrance_y),
        latitude: buildingForm.latitude ? Number(buildingForm.latitude) : null,
        longitude: buildingForm.longitude ? Number(buildingForm.longitude) : null
      };
      const building = editingBuilding ? await ApiService.updateBuilding(editingBuilding.id, payload) : await ApiService.createBuilding(payload);
      setBuildings(prev => editingBuilding ? prev.map(item => item.id === building.id ? building : item) : [...prev, building]);
      setRoomForm(prev => ({ ...prev, building_id: String(building.id) }));
      setShowBuildingModal(false);
      setShowBuildingMapPicker(false);
      setEditingBuilding(null);
      setBuildingForm({ building_code: '', name: '', description: '', floors: '1', color: '#2563eb', x: '500', y: '350', width: '200', height: '140', entrance_x: '500', entrance_y: '350', latitude: '', longitude: '' });
    } catch (error: any) {
      window.alert(error.response?.data?.message || 'Không thể lưu tòa nhà.');
    }
  };

  const handleDeleteBuilding = async (building: Building) => {
    if (!window.confirm(`Xóa ${building.name} và toàn bộ phòng thuộc tòa này? Thiết bị và phiếu báo hỏng sẽ được gỡ liên kết.`)) return;
    try {
      await ApiService.deleteBuilding(building.id);
      setBuildings(prev => prev.filter(item => item.id !== building.id));
      setRooms(prev => prev.filter(room => room.building_id !== building.id));
    } catch (error: any) {
      window.alert(error.response?.data?.message || 'Không thể xóa tòa nhà.');
    }
  };

  const openEditRoom = (room: Room) => {
    setShowRoomMapPicker(false);
    setRoomForm({
      building_id: String(room.building_id),
      room_number: room.room_number,
      name: room.name,
      floor: String(room.floor),
      qr_code: room.qr_code,
      status: room.status,
      description: room.description || '',
      x: String(room.x),
      y: String(room.y),
      width: String(room.width),
      height: String(room.height),
      room_type: room.room_type,
      door_x: String(room.door_x),
      door_y: String(room.door_y),
      latitude: room.latitude == null ? '' : String(room.latitude),
      longitude: room.longitude == null ? '' : String(room.longitude)
    });
    setRoomModal({ mode: 'edit', room });
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (roomModal?.mode === 'edit' && roomModal.room) {
        const updated = await ApiService.updateRoom(roomModal.room.id, {
          building_id: Number(roomForm.building_id),
          room_number: roomForm.room_number,
          name: roomForm.name,
          floor: Number(roomForm.floor),
          qr_code: roomForm.qr_code,
          status: roomForm.status,
          description: roomForm.description,
          x: Number(roomForm.x),
          y: Number(roomForm.y),
          width: Number(roomForm.width),
          height: Number(roomForm.height),
          room_type: roomForm.room_type,
          door_x: Number(roomForm.door_x),
          door_y: Number(roomForm.door_y),
          latitude: roomForm.latitude ? Number(roomForm.latitude) : null,
          longitude: roomForm.longitude ? Number(roomForm.longitude) : null
        });
        setRooms(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item));
      } else {
        const created = await ApiService.createRoom({
          building_id: Number(roomForm.building_id),
          room_number: roomForm.room_number,
          name: roomForm.name,
          floor: Number(roomForm.floor),
          qr_code: roomForm.qr_code,
          status: roomForm.status,
          description: roomForm.description,
          x: Number(roomForm.x),
          y: Number(roomForm.y),
          width: Number(roomForm.width),
          height: Number(roomForm.height),
          room_type: roomForm.room_type,
          door_x: Number(roomForm.door_x),
          door_y: Number(roomForm.door_y),
          latitude: roomForm.latitude ? Number(roomForm.latitude) : null,
          longitude: roomForm.longitude ? Number(roomForm.longitude) : null
        });
        setRooms(prev => [...prev, created]);
      }
      setShowRoomModal(false);
      setRoomModal(null);
      setRoomForm({
        building_id: '1',
        room_number: '',
        name: '',
        floor: '1',
        qr_code: '',
        status: 'ACTIVE',
        description: '',
        x: '0',
        y: '0',
        width: '180',
        height: '120',
        room_type: 'CLASSROOM',
        door_x: '50',
        door_y: '50',
        latitude: '',
        longitude: ''
      });
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Không thể lưu phòng.');
    }
  };

  const handleFloorMapPick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width;
    const ratioY = (event.clientY - rect.top) / rect.height;
    const x = Math.round(Math.max(0, Math.min(900, ratioX * 900)));
    const y = Math.round(Math.max(0, Math.min(320, ratioY * 320)));

    setRoomForm(prev => ({
      ...prev,
      x: String(x),
      y: String(y),
      door_x: String(Math.max(20, Math.round(x + 30))),
      door_y: String(Math.max(20, Math.round(y + 30)))
    }));
  };

  const handleRoomMapPick = ({ lat, lng }: { lat: number; lng: number }) => {
    const building = buildings.find(item => String(item.id) === roomForm.building_id);
    if (!building) {
      window.alert('Hãy chọn tòa nhà trước khi chọn vị trí phòng trên bản đồ.');
      return;
    }

    const [buildingLat, buildingLng] = Number.isFinite(building.latitude) && Number.isFinite(building.longitude) ? [Number(building.latitude), Number(building.longitude)] : [
      10.9822 - building.y * 0.000006,
      106.6732 + building.x * 0.000006
    ];
    // Translate a click near the building into the 900 x 320 floor-plan space.
    const x = Math.round(Math.max(0, Math.min(900, 450 + (lng - buildingLng) * 1800000)));
    const y = Math.round(Math.max(0, Math.min(320, 160 - (lat - buildingLat) * 1400000)));
    setRoomForm(previous => ({
      ...previous,
      x: String(x),
      y: String(y),
      latitude: String(lat),
      longitude: String(lng),
      door_x: String(Math.max(20, Math.round(x + 30))),
      door_y: String(Math.max(20, Math.round(y + 30)))
    }));
    setShowRoomMapPicker(false);
  };

  const handleFloorPlanMapPick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - rect.left) / rect.width;
    const ratioY = (event.clientY - rect.top) / rect.height;
    const x = Math.round(Math.max(0, Math.min(900, ratioX * 900)));
    const y = Math.round(Math.max(0, Math.min(320, ratioY * 320)));

    setRoomForm(prev => ({
      ...prev,
      x: String(x),
      y: String(y),
      door_x: String(Math.max(20, Math.round(x + 30))),
      door_y: String(Math.max(20, Math.round(y + 30)))
    }));
  };

  const handleMoveRoomOnFloorPlan = async (room: Room, position: Pick<Room, 'x' | 'y' | 'width' | 'height' | 'door_x' | 'door_y'>) => {
    const previousRoom = rooms.find(item => item.id === room.id);
    setRooms(previous => previous.map(item => item.id === room.id ? { ...item, ...position } : item));
    try {
      await ApiService.updateRoom(room.id, position);
    } catch (error: any) {
      if (previousRoom) setRooms(previous => previous.map(item => item.id === room.id ? previousRoom : item));
      window.alert(error.response?.data?.message || 'Không thể lưu vị trí phòng. Vui lòng thử lại.');
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!window.confirm(`Xóa phòng ${room.room_number} (${room.name})?`)) return;
    try {
      await ApiService.deleteRoom(room.id);
      // Refresh this list from the source of truth immediately. Do not wait for
      // unrelated dashboard requests, which could otherwise leave a stale row.
      const updatedRooms = await ApiService.getRooms();
      setRooms(updatedRooms);
      setDevices(prev => prev.map(device => device.room_id === room.id ? { ...device, room_id: null } : device));
    } catch (err: any) {
      if (err.response?.status === 404) {
        // The room was already removed but an older list was still visible.
        // Refresh it so the stale row disappears without requiring a full reload.
        try {
          setRooms(await ApiService.getRooms());
          window.alert('Phòng này đã được xóa trước đó. Danh sách đã được đồng bộ lại.');
          return;
        } catch {
          // Fall through to the regular error if the refresh also fails.
        }
      }
      window.alert(err.response?.data?.message || 'Không thể xóa phòng.');
    }
  };

  const matchesSearch = (value: unknown, term: string) => String(value || '').toLowerCase().includes(term.trim().toLowerCase());
  const filteredDevices = devices.filter(device => !deviceSearch.trim() || [device.device_code, device.name, device.model, device.room_name, device.category_name, device.qr_code].some(value => matchesSearch(value, deviceSearch)));
  const filteredBuildingsAdmin = buildings.filter(building => !buildingSearch.trim() || [building.building_code, building.name, building.description].some(value => matchesSearch(value, buildingSearch)));
  const filteredRoomsAdmin = rooms.filter(room => !roomSearch.trim() || [room.room_number, room.name, room.building_code, buildings.find(building => building.id === room.building_id)?.name].some(value => matchesSearch(value, roomSearch)));

  const devicesPerPage = 14;
  const deviceTotalPages = Math.max(1, Math.ceil(filteredDevices.length / devicesPerPage));
  const currentDevicePage = Math.min(devicePage, deviceTotalPages);
  const displayedDevices = filteredDevices.slice(
    (currentDevicePage - 1) * devicesPerPage,
    currentDevicePage * devicesPerPage
  );
  const deviceFirstItem = filteredDevices.length === 0 ? 0 : (currentDevicePage - 1) * devicesPerPage + 1;
  const deviceLastItem = Math.min(currentDevicePage * devicesPerPage, filteredDevices.length);

  const buildingsPerPage = 14;
  const buildingTotalPages = Math.max(1, Math.ceil(filteredBuildingsAdmin.length / buildingsPerPage));
  const currentBuildingPage = Math.min(buildingPage, buildingTotalPages);
  const displayedBuildings = filteredBuildingsAdmin.slice(
    (currentBuildingPage - 1) * buildingsPerPage,
    currentBuildingPage * buildingsPerPage
  );

  const roomsPerPage = 14;
  const roomTotalPages = Math.max(1, Math.ceil(filteredRoomsAdmin.length / roomsPerPage));
  const currentRoomPage = Math.min(roomPage, roomTotalPages);
  const displayedRooms = filteredRoomsAdmin.slice(
    (currentRoomPage - 1) * roomsPerPage,
    currentRoomPage * roomsPerPage
  );

  const activeReportList = isReporter && reportListView === 'mine' ? mySubmittedReports : reports;
  const filteredReports = activeReportList.filter(report => !reportSearch.trim() || [report.report_code, report.title, report.description, report.room_name, report.device_name, report.reporter_name].some(value => matchesSearch(value, reportSearch)));
  const filteredLogs = logs.filter(log => !logSearch.trim() || [log.device_name, log.technician_name, log.action_taken, log.note].some(value => matchesSearch(value, logSearch)));
  const filteredUsers = usersList.filter(user => !userSearch.trim() || [user.full_name, user.username, user.email, user.phone, user.role_name].some(value => matchesSearch(value, userSearch)));

  const reportTotalPages = Math.max(1, Math.ceil(filteredReports.length / 14));
  const currentReportPage = Math.min(reportPage, reportTotalPages);
  const displayedReports = filteredReports.slice((currentReportPage - 1) * 14, currentReportPage * 14);
  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / 14));
  const currentLogPage = Math.min(logPage, logTotalPages);
  const displayedLogs = filteredLogs.slice((currentLogPage - 1) * 14, currentLogPage * 14);
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / 14));
  const currentUserPage = Math.min(userPage, userTotalPages);
  const displayedUsers = filteredUsers.slice((currentUserPage - 1) * 14, currentUserPage * 14);

  const renderPagination = (totalItems: number, currentPage: number, totalPages: number, onChange: (page: number) => void, label: string) => {
    if (totalItems === 0) return null;
    const first = (currentPage - 1) * 14 + 1;
    const last = Math.min(currentPage * 14, totalItems);
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <p className="text-xs text-slate-500">Hiển thị <strong className="text-slate-700">{first}–{last}</strong> / {totalItems} {label}</p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
          {pages.map((page, index) => (
            <React.Fragment key={page}>
              {index > 0 && page - pages[index - 1] > 1 && <span className="px-1 text-xs text-slate-400">…</span>}
              <button type="button" onClick={() => onChange(page)} className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-bold ${page === currentPage ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{page}</button>
            </React.Fragment>
          ))}
          <button type="button" onClick={() => onChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
        </div>
      </div>
    );
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

      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {canViewReports && <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'reports'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isReporter ? 'Theo Dõi Sự Cố' : `Phiếu Báo Hỏng Cần Xử Lý (${reports.filter(r => r.status !== 'RESOLVED').length})`}</span>
        </button>}

        {canManageDevices && <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'devices'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Quản lý thiết bị ({devices.length})</span>
        </button>}

        {canSeeRoomsTab && (
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'rooms'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Quản Lý Phòng ({rooms.length})</span>
          </button>
        )}

        {canViewLogs && <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'logs'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Nhật Ký Bảo Trì ({logs.length})</span>
        </button>}

        {canManageAccounts && (
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
        )}
      </div>

      {/* Tab Content 1: Reports Management */}
      {activeTab === 'reports' && canViewReports && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-600" />{isReporter ? 'Theo dõi tình trạng thiết bị hư hỏng' : 'Quản lý phiếu báo hỏng'}</h2>
              <p className="text-xs text-slate-500 mt-1">{isReporter ? 'Xem sự cố mới nhất và tiến trình các phiếu do bạn gửi. Chỉ KTV/Admin mới được cập nhật.' : 'Tìm theo mã phiếu, phòng, thiết bị hoặc người báo.'}</p>
            </div>
            <label className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={reportSearch} onChange={e => { setReportSearch(e.target.value); setReportPage(1); }} placeholder="Tìm phiếu báo hỏng..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
            </label>
          </div>
          {isReporter && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <button type="button" onClick={() => { setReportListView('all'); setReportPage(1); }} className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition-colors ${reportListView === 'all' ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Toàn bộ thiết bị hư hỏng ({reports.length})
              </button>
              <button type="button" onClick={() => { setReportListView('mine'); setReportPage(1); }} className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition-colors ${reportListView === 'mine' ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Phiếu tôi đã gửi ({mySubmittedReports.length})
              </button>
            </div>
          )}
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              {activeReportList.length === 0 ? 'Hiện không có phiếu báo hỏng nào.' : 'Không tìm thấy phiếu báo hỏng phù hợp.'}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedReports.map(report => (
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

                    {(report.image_urls || []).length > 0 && (
                      <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                        <p className="mb-2 text-[11px] font-extrabold text-sky-800">Ảnh minh chứng sự cố</p>
                        <div className="flex flex-wrap gap-2">
                          {report.image_urls.filter(Boolean).map((imageUrl, index) => (
                            <button
                              key={`${report.id}-${imageUrl}`}
                              type="button"
                              onClick={() => setSelectedReportImage({ url: imageUrl, reportCode: report.report_code })}
                              className="group relative h-20 w-28 overflow-hidden rounded-lg border border-sky-200 bg-white text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                              title="Bấm để xem ảnh lớn"
                            >
                              <img
                                src={imageUrl}
                                alt={`Ảnh sự cố ${index + 1} của ${report.report_code}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              <span className="absolute inset-x-0 bottom-0 bg-slate-950/60 py-0.5 text-center text-[10px] font-bold text-white">Xem ảnh</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>📍 Phòng: <strong className="text-slate-800">{report.room_name}</strong></span>
                      <span>⚙️ Thiết bị: <strong className="text-slate-800">{report.device_name || 'Phòng'}</strong></span>
                      {!isReporter && <span>👤 Người báo: <strong className="text-slate-800">{report.reporter_name} ({report.reporter_phone})</strong></span>}
                    </div>

                    {report.solution_note && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">
                        ✅ KTV ghi chú: {report.solution_note} ({report.assigned_technician_name})
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex sm:flex-col gap-2">
                    {canResolveReports && <button
                      onClick={() => {
                        setSelectedReport(report);
                        setNewStatus(report.status === 'RESOLVED' ? 'RESOLVED' : 'IN_PROGRESS');
                        setSolutionNote(report.solution_note || '');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Cập nhật tiến độ
                    </button>}
                  </div>
                </div>
              ))}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                {renderPagination(filteredReports.length, currentReportPage, reportTotalPages, setReportPage, 'phiếu báo hỏng')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Devices Table */}
      {activeTab === 'devices' && canManageDevices && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-600" />
                <span>Quản lý thiết bị</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Danh sách thiết bị, vị trí phòng, mã QR và trạng thái sử dụng.</p>
            </div>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
              <label className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={deviceSearch} onChange={e => { setDeviceSearch(e.target.value); setDevicePage(1); }} placeholder="Tìm thiết bị, phòng, mã QR..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
              </label>
              {canManageDevices && <button type="button" onClick={() => { setDeviceModal({ mode: 'create' }); setShowAddDeviceModal(true); }} className="inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all"><Plus className="w-4 h-4" /><span>Thêm thiết bị</span></button>}
            </div>
          </div>

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
                  {canManageDevices && <th className="px-5 py-4 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDevices.map(dev => (
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
                    {canManageDevices && (
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
            {devices.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Hiển thị <strong className="text-slate-700">{deviceFirstItem}–{deviceLastItem}</strong> / {filteredDevices.length} thiết bị
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDevicePage(page => Math.max(1, page - 1))}
                    disabled={currentDevicePage === 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  {Array.from({ length: deviceTotalPages }, (_, index) => index + 1)
                    .filter(page => page === 1 || page === deviceTotalPages || Math.abs(page - currentDevicePage) <= 1)
                    .map((page, index, pages) => (
                      <React.Fragment key={page}>
                        {index > 0 && page - pages[index - 1] > 1 && <span className="px-1 text-xs text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setDevicePage(page)}
                          className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                            page === currentDevicePage ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    type="button"
                    onClick={() => setDevicePage(page => Math.min(deviceTotalPages, page + 1))}
                    disabled={currentDevicePage === deviceTotalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Room Management */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setManagementSection('buildings')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  managementSection === 'buildings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Quản lý tòa ({buildings.length})
              </button>
              <button
                type="button"
                onClick={() => setManagementSection('rooms')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  managementSection === 'rooms' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Quản lý phòng ({rooms.length})
              </button>
            </div>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {managementSection === 'buildings' ? (
                <label className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={buildingSearch} onChange={e => { setBuildingSearch(e.target.value); setBuildingPage(1); }} placeholder="Tìm mã tòa, tên tòa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                </label>
              ) : (
                <label className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={roomSearch} onChange={e => { setRoomSearch(e.target.value); setRoomPage(1); }} placeholder="Tìm mã phòng, tên phòng, tòa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
                </label>
              )}
              {canManageRoomCrud && (
                <button
                  type="button"
                  onClick={managementSection === 'buildings' ? openCreateBuilding : openCreateRoom}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                    managementSection === 'buildings' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{managementSection === 'buildings' ? 'Thêm tòa' : 'Thêm phòng'}</span>
                </button>
              )}
            </div>
          </div>
          {managementSection === 'buildings' ? (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-extrabold text-slate-900">Danh sách tòa / dãy</h2>
                <p className="mt-1 text-xs text-slate-500">Sửa thông tin, số tầng, vị trí hoặc xóa tòa nhà.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {displayedBuildings.map(building => (
                  <div key={building.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50/60">
                    <span className="rounded-xl px-2.5 py-1.5 text-xs font-black text-white" style={{ backgroundColor: building.color || '#2563eb' }}>{building.building_code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900">{building.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{building.floors} tầng · {rooms.filter(room => room.building_id === building.id).length} phòng</p>
                    </div>
                    {canManageRoomCrud && <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEditBuilding(building)} title="Sửa tòa" className="inline-flex p-2 rounded-lg text-sky-700 hover:bg-sky-50"><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleDeleteBuilding(building)} title="Xóa tòa" className="inline-flex p-2 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                    </div>}
                  </div>
                ))}
              </div>
              {renderPagination(filteredBuildingsAdmin.length, currentBuildingPage, buildingTotalPages, setBuildingPage, 'tòa / dãy')}
            </div>
          ) : (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">Phòng</th>
                    <th className="px-5 py-4">Tên</th>
                    <th className="px-5 py-4">Tòa</th>
                    <th className="px-5 py-4">Tầng</th>
                    <th className="px-5 py-4">Vị trí</th>
                    <th className="px-5 py-4">Loại</th>
                    <th className="px-5 py-4">Thiết bị</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    {hasPermission('MANAGE_ROOMS') && <th className="px-5 py-4 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRooms.map(room => {
                    const roomBuilding = buildings.find(b => b.id === room.building_id);
                    const roomDevices = devices.filter(d => d.room_id === room.id);

                    return (
                      <tr key={room.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-mono font-black text-sky-700">{room.room_number}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{room.name}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">{roomBuilding?.name || room.building_code || 'N/A'}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">Tầng {room.floor}</td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-800">x:{room.x}, y:{room.y}</span>
                          <span className="block text-[11px] text-slate-400">door: {room.door_x},{room.door_y}</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800">{room.room_type}</td>
                        <td className="px-5 py-4">
                          {roomDevices.length === 0 ? (
                            <span className="text-slate-400 text-[11px]">Chưa có thiết bị</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {roomDevices.slice(0, 4).map(dev => (
                                <span key={dev.id} className="inline-flex px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                                  {dev.name}
                                </span>
                              ))}
                              {roomDevices.length > 4 && (
                                <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                  +{roomDevices.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-extrabold border ${
                            room.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            room.status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>{room.status}</span>
                        </td>
                        {canManageRoomCrud && (
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button type="button" onClick={() => openEditRoom(room)} title="Sửa phòng" className="inline-flex p-2 rounded-lg text-sky-700 hover:bg-sky-50">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleDeleteRoom(room)} title="Xóa phòng" className="inline-flex p-2 rounded-lg text-rose-600 hover:bg-rose-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredRoomsAdmin.length, currentRoomPage, roomTotalPages, setRoomPage, 'phòng')}
          </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Maintenance Logs */}
      {activeTab === 'logs' && canViewLogs && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Wrench className="w-5 h-5 text-sky-600" />Nhật ký bảo trì</h2>
              <p className="text-xs text-slate-500 mt-1">Tìm theo thiết bị, kỹ thuật viên hoặc nội dung xử lý.</p>
            </div>
            <label className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={logSearch} onChange={e => { setLogSearch(e.target.value); setLogPage(1); }} placeholder="Tìm nhật ký bảo trì..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
            </label>
          </div>
          {displayedLogs.map(log => (
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
          {filteredLogs.length === 0 && <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">Không tìm thấy nhật ký bảo trì phù hợp.</div>}
          {filteredLogs.length > 0 && <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">{renderPagination(filteredLogs.length, currentLogPage, logTotalPages, setLogPage, 'nhật ký')}</div>}
        </div>
      )}

      {/* Tab Content 5: RBAC & Permissions Management */}
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

            <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }} placeholder="Tìm tài khoản..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
              </label>
              <button onClick={loadUsersData} disabled={usersLoading} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} /><span>Làm mới</span></button>
              {canManageAccounts && <button onClick={openCreateUser} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"><UserPlus className="w-3.5 h-3.5" /><span>Thêm KTV</span></button>}
            </div>
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
                  {displayedUsers.map(u => {
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
                            disabled={!canManageAccounts || savingRoleUserId === u.id}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm disabled:cursor-wait disabled:opacity-60"
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
                          {savingRoleUserId === u.id && (
                            <p className="mt-1 text-[10px] font-bold text-sky-600">Đang lưu quyền...</p>
                          )}
                          {savingRoleUserId !== u.id && userMsg?.id === u.id && (
                            <p className={`mt-1 text-[10px] font-bold ${userMsg.error ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {userMsg.text}
                            </p>
                          )}
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
                                  disabled={!canManageAccounts || isDisabled}
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
                            disabled={!canManageAccounts}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/25 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu quyền</span>
                          </button>

                          {canManageAccounts && (
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
            {filteredUsers.length > 0 && renderPagination(filteredUsers.length, currentUserPage, userTotalPages, setUserPage, 'tài khoản')}
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

      {showBuildingManager && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div><h3 className="text-lg font-extrabold text-slate-900">Quản lý tòa / dãy</h3><p className="text-xs text-slate-500 mt-1">Sửa tên, số tầng, vị trí hoặc xóa tòa cùng các phòng thuộc tòa.</p></div>
              <button type="button" onClick={() => setShowBuildingManager(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {buildings.map(building => <div key={building.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <span className="rounded-lg px-2 py-1 text-xs font-black text-white" style={{ backgroundColor: building.color || '#2563eb' }}>{building.building_code}</span>
                <div className="min-w-0 flex-1"><p className="font-bold text-sm text-slate-900 truncate">{building.name}</p><p className="text-[11px] text-slate-500">{building.floors} tầng</p></div>
                <button type="button" onClick={() => openEditBuilding(building)} className="p-2 rounded-lg text-sky-700 hover:bg-sky-50" title="Sửa tòa"><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleDeleteBuilding(building)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" title="Xóa tòa"><Trash2 className="w-4 h-4" /></button>
              </div>)}
            </div>
          </div>
        </div>
      )}

      {showBuildingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{editingBuilding ? 'Sửa tòa nhà' : 'Thêm tòa nhà'}</h3>
                <p className="text-xs text-slate-500 mt-1">{editingBuilding ? 'Cập nhật thông tin và vị trí tòa trong SQL.' : 'Tòa mới sẽ xuất hiện trực tiếp trên bản đồ.'}</p>
              </div>
              <button type="button" onClick={() => { setShowBuildingModal(false); setShowBuildingMapPicker(false); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Đóng"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveBuilding} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-slate-700">Mã tòa *<input value={buildingForm.building_code} onChange={e => setBuildingForm({ ...buildingForm, building_code: e.target.value })} placeholder="Ví dụ: D" required className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                <label className="text-xs font-bold text-slate-700">Số tầng *<input type="number" min="1" value={buildingForm.floors} onChange={e => setBuildingForm({ ...buildingForm, floors: e.target.value })} required className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
              </div>
              <label className="block text-xs font-bold text-slate-700">Tên tòa *<input value={buildingForm.name} onChange={e => setBuildingForm({ ...buildingForm, name: e.target.value })} placeholder="Ví dụ: Tòa nhà D" required className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
              <label className="block text-xs font-bold text-slate-700">Mô tả<textarea value={buildingForm.description} onChange={e => setBuildingForm({ ...buildingForm, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs font-bold text-slate-700">Màu<input type="color" value={buildingForm.color} onChange={e => setBuildingForm({ ...buildingForm, color: e.target.value })} className="w-full h-10 mt-1 p-1 bg-slate-50 border border-slate-200 rounded-xl" /></label>
                <label className="text-xs font-bold text-slate-700">Vị trí X<input type="number" value={buildingForm.x} onChange={e => setBuildingForm({ ...buildingForm, x: e.target.value, entrance_x: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
                <label className="text-xs font-bold text-slate-700">Vị trí Y<input type="number" value={buildingForm.y} onChange={e => setBuildingForm({ ...buildingForm, y: e.target.value, entrance_y: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></label>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-sky-800">Chọn vị trí trực tiếp trên bản đồ</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Bấm đúng nơi muốn đặt tòa nhà; tọa độ sẽ tự điền.</p>
                  </div>
                  <button type="button" onClick={() => setShowBuildingMapPicker(value => !value)} className="shrink-0 rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-700">
                    {showBuildingMapPicker ? 'Ẩn bản đồ' : 'Chọn trên bản đồ'}
                  </button>
                </div>
                {showBuildingMapPicker && (
                  <div className="mt-3 h-80 overflow-hidden rounded-xl border border-slate-200">
                    <LeafletCampusMap
                      buildings={buildings}
                      pois={[]}
                      rooms={[]}
                      selectedBuildingId={null}
                      onSelectBuilding={() => undefined}
                      pickMode
                      onPickMapPosition={({ lat, lng }) => {
                        const x = Math.round(Math.max(0, Math.min(1000, (lng - 106.6732) / 0.000006)));
                        const y = Math.round(Math.max(0, Math.min(700, (10.9822 - lat) / 0.000006)));
                        setBuildingForm(previous => ({ ...previous, x: String(x), y: String(y), entrance_x: String(x), entrance_y: String(y), latitude: String(lat), longitude: String(lng) }));
                        setShowBuildingMapPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700">{editingBuilding ? 'Lưu tòa nhà' : 'Thêm tòa nhà'}</button>
                <button type="button" onClick={() => { setShowBuildingModal(false); setShowBuildingMapPicker(false); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room management modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in">
            <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sticky top-0 bg-white rounded-t-3xl z-10 shrink-0">
              <h3 className="text-lg font-extrabold text-slate-900">{roomModal?.mode === 'edit' ? 'Sửa thông tin phòng' : 'Thêm phòng mới'}</h3>
              <button type="button" onClick={() => { setShowRoomModal(false); setRoomModal(null); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Đóng"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto px-6 sm:px-8 pb-6 sm:pb-8 space-y-5">
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Mã phòng *</label>
                  <input value={roomForm.room_number} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Tên phòng *</label>
                  <input value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tòa nhà</label>
                  {buildings.length > 0 ? (
                    <select value={roomForm.building_id} onChange={e => setRoomForm({ ...roomForm, building_id: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      {buildings.map(b => <option key={b.id} value={b.id}>[{b.building_code}] {b.name}</option>)}
                    </select>
                  ) : (
                    <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      {buildingLoadError ? 'Không tải được danh sách tòa nhà.' : 'Chưa có tòa nhà nào.'}
                      <button type="button" onClick={loadBuildingsData} className="ml-2 font-bold underline">Tải lại</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Tầng</label>
                  <input type="number" min={1} value={roomForm.floor} onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Loại phòng</label>
                  <select value={roomForm.room_type} onChange={e => setRoomForm({ ...roomForm, room_type: e.target.value as Room['room_type'] })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <option value="CLASSROOM">CLASSROOM</option>
                    <option value="LAB">LAB</option>
                    <option value="HALL">HALL</option>
                    <option value="STAIRS">STAIRS</option>
                    <option value="WC">WC</option>
                    <option value="ELEVATOR">ELEVATOR</option>
                    <option value="OFFICE">OFFICE</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Trạng thái</label>
                  <select value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value as Room['status'] })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Mã QR phòng</label>
                <input value={roomForm.qr_code} onChange={e => setRoomForm({ ...roomForm, qr_code: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Mô tả</label>
                <textarea value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-extrabold text-sky-800">Chọn vị trí phòng</span>
                    <p className="text-[10px] text-slate-500 mt-1">Bấm trên bản đồ hoặc sơ đồ tầng để lấy x:y.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700">{roomForm.latitude ? `${roomForm.latitude}, ${roomForm.longitude}` : `x:${roomForm.x} · y:${roomForm.y}`}</span>
                    <button
                      type="button"
                      disabled={buildings.length === 0}
                      onClick={() => setShowRoomMapPicker(value => !value)}
                      className="rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {showRoomMapPicker ? 'Ẩn bản đồ' : 'Chọn trên bản đồ'}
                    </button>
                  </div>
                </div>

                {showRoomMapPicker && buildings.length > 0 && (
                  <div className="mt-3 h-80 overflow-hidden rounded-xl border border-slate-200">
                    <LeafletCampusMap
                      buildings={buildings}
                      pois={[]}
                      rooms={[]}
                      selectedBuildingId={Number(roomForm.building_id) || null}
                      onSelectBuilding={() => undefined}
                      pickMode
                      pickModeMessage="Bấm gần tòa đã chọn để lấy vị trí phòng"
                      onPickMapPosition={handleRoomMapPick}
                    />
                  </div>
                )}

                {buildings.length > 0 ? (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200">
                    <FloorPlanMap
                      building={buildings.find(b => String(b.id) === roomForm.building_id) || buildings[0]}
                      rooms={rooms}
                      selectedFloor={Number(roomForm.floor) || 1}
                      onSelectFloor={(floor) => setRoomForm({ ...roomForm, floor: String(floor) })}
                      selectedRoom={null}
                      onSelectRoom={() => null}
                      onMapClick={handleFloorMapPick}
                      editable={canManageRoomCrud}
                      onMoveRoom={handleMoveRoomOnFloorPlan}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-amber-700">Hãy tải được danh sách tòa nhà trước, sau đó sơ đồ tầng sẽ hiện tại đây.</p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">x</label>
                  <input type="number" value={roomForm.x} onChange={e => setRoomForm({ ...roomForm, x: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">y</label>
                  <input type="number" value={roomForm.y} onChange={e => setRoomForm({ ...roomForm, y: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">width</label>
                  <input type="number" value={roomForm.width} onChange={e => setRoomForm({ ...roomForm, width: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">height</label>
                  <input type="number" value={roomForm.height} onChange={e => setRoomForm({ ...roomForm, height: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">door_x</label>
                  <input type="number" value={roomForm.door_x} onChange={e => setRoomForm({ ...roomForm, door_x: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">door_y</label>
                  <input type="number" value={roomForm.door_y} onChange={e => setRoomForm({ ...roomForm, door_y: e.target.value })} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700">
                  {roomModal?.mode === 'edit' ? 'Lưu phòng' : 'Thêm phòng'}
                </button>
                  <button type="button" onClick={() => { setShowRoomModal(false); setRoomModal(null); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                  Hủy
                </button>
              </div>
            </form>
            </div>
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

      {selectedReportImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setSelectedReportImage(null)}>
          <div className="relative max-h-full max-w-5xl" onClick={event => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedReportImage(null)} className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-slate-700 shadow-lg hover:bg-slate-100" title="Đóng ảnh"><X className="h-5 w-5" /></button>
            <img src={selectedReportImage.url} alt={`Ảnh minh chứng ${selectedReportImage.reportCode}`} className="max-h-[85vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl" />
            <p className="mt-2 text-center text-xs font-bold text-white">Ảnh minh chứng — {selectedReportImage.reportCode}</p>
          </div>
        </div>
      )}
    </div>
  );
};

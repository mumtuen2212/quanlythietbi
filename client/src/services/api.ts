import axios from 'axios';
import {
  Building,
  Room,
  DeviceCategory,
  Device,
  Manual,
  IncidentReport,
  MaintenanceLog,
  DashboardStats,
  CampusPOI,
  User,
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  Permission,
  RoleName
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// Automatically attach JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ApiService = {
  // Stats
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/stats');
    return res.data.data;
  },

  // Buildings & Rooms
  getPois: async (): Promise<CampusPOI[]> => {
    const res = await api.get<{ success: boolean; data: CampusPOI[] }>('/pois');
    return res.data.data;
  },

  getBuildings: async (): Promise<Building[]> => {
    const res = await api.get<{ success: boolean; data: Building[] }>('/buildings');
    return res.data.data;
  },

  getRooms: async (buildingId?: number, floor?: number): Promise<Room[]> => {
    const res = await api.get<{ success: boolean; data: Room[] }>('/rooms', {
      params: { building_id: buildingId, floor }
    });
    return res.data.data;
  },

  getRoomById: async (id: number): Promise<Room> => {
    const res = await api.get<{ success: boolean; data: Room }>(`/rooms/${id}`);
    return res.data.data;
  },

  getRoomByQr: async (qrCode: string): Promise<Room> => {
    const res = await api.get<{ success: boolean; data: Room }>(`/rooms/qr/${qrCode}`);
    return res.data.data;
  },

  // Categories & Devices
  getCategories: async (): Promise<DeviceCategory[]> => {
    const res = await api.get<{ success: boolean; data: DeviceCategory[] }>('/categories');
    return res.data.data;
  },

  getDevices: async (params?: { category_id?: number; status?: string; room_id?: number }): Promise<Device[]> => {
    const res = await api.get<{ success: boolean; data: Device[] }>('/devices', { params });
    return res.data.data;
  },

  getDeviceById: async (id: number): Promise<Device> => {
    const res = await api.get<{ success: boolean; data: Device }>(`/devices/${id}`);
    return res.data.data;
  },

  getDeviceByQr: async (qrCode: string): Promise<Device> => {
    const res = await api.get<{ success: boolean; data: Device }>(`/devices/qr/${qrCode}`);
    return res.data.data;
  },

  createDevice: async (deviceData: any): Promise<Device> => {
    const res = await api.post<{ success: boolean; data: Device }>('/devices', deviceData);
    return res.data.data;
  },

  updateDeviceStatus: async (id: number, status: string): Promise<Device> => {
    const res = await api.patch<{ success: boolean; data: Device }>(`/devices/${id}/status`, { status });
    return res.data.data;
  },

  updateDevice: async (id: number, payload: Partial<Device>): Promise<Device> => {
    const res = await api.patch<{ success: boolean; data: Device }>(`/devices/${id}`, payload);
    return res.data.data;
  },

  deleteDevice: async (id: number): Promise<void> => {
    await api.delete(`/devices/${id}`);
  },

  // Manuals
  getManuals: async (): Promise<Manual[]> => {
    const res = await api.get<{ success: boolean; data: Manual[] }>('/manuals');
    return res.data.data;
  },

  getManualById: async (id: number): Promise<Manual> => {
    const res = await api.get<{ success: boolean; data: Manual }>(`/manuals/${id}`);
    return res.data.data;
  },

  getManualByDeviceId: async (deviceId: number): Promise<Manual> => {
    const res = await api.get<{ success: boolean; data: Manual }>(`/manuals/device/${deviceId}`);
    return res.data.data;
  },

  // Incident Reports
  getIncidentReports: async (params?: { status?: string; room_id?: number }): Promise<IncidentReport[]> => {
    const res = await api.get<{ success: boolean; data: IncidentReport[] }>('/incident-reports', { params });
    return res.data.data;
  },

  createIncidentReport: async (formData: FormData): Promise<{ success: boolean; message: string; data: IncidentReport }> => {
    const res = await api.post('/incident-reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  updateIncidentStatus: async (
    id: number,
    payload: { status: string; technician_name?: string; solution_note?: string }
  ): Promise<IncidentReport> => {
    const res = await api.patch<{ success: boolean; data: IncidentReport }>(`/incident-reports/${id}/status`, payload);
    return res.data.data;
  },

  // Maintenance Logs
  getMaintenanceLogs: async (): Promise<MaintenanceLog[]> => {
    const res = await api.get<{ success: boolean; data: MaintenanceLog[] }>('/maintenance-logs');
    return res.data.data;
  },

  createMaintenanceLog: async (logData: any): Promise<MaintenanceLog> => {
    const res = await api.post<{ success: boolean; data: MaintenanceLog }>('/maintenance-logs', logData);
    return res.data.data;
  },

  // QR Generator
  getQrCodeUrl: async (text: string): Promise<string> => {
    const res = await api.get<{ success: boolean; qr_data_url: string }>('/qr/generate', {
      params: { text }
    });
    return res.data.qr_data_url;
  },

  // Auth & RBAC
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await api.post<{ success: boolean; message: string; data: AuthResponse }>('/auth/login', payload);
    return res.data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await api.post<{ success: boolean; message: string; data: AuthResponse }>('/auth/register', payload);
    return res.data.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data.data;
  },

  getUsers: async (): Promise<User[]> => {
    const res = await api.get<{ success: boolean; data: User[] }>('/auth/users');
    return res.data.data;
  },

  createUser: async (payload: {
    username: string;
    password: string;
    full_name: string;
    email: string;
    phone?: string;
    role_name: RoleName;
  }): Promise<User> => {
    const res = await api.post<{ success: boolean; message: string; data: User }>('/auth/users', payload);
    return res.data.data;
  },

  updateUser: async (userId: number, payload: {
    full_name: string;
    email: string;
    phone?: string;
    password?: string;
    role_name: RoleName;
  }): Promise<User> => {
    const res = await api.patch<{ success: boolean; message: string; data: User }>(`/auth/users/${userId}`, payload);
    return res.data.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/auth/users/${userId}`);
  },

  updateUserPermissions: async (
    userId: number,
    permissions: Permission[],
    role_name?: RoleName
  ): Promise<User> => {
    const res = await api.patch<{ success: boolean; message: string; data: User }>(
      `/auth/users/${userId}/permissions`,
      { permissions, role_name }
    );
    return res.data.data;
  }
};

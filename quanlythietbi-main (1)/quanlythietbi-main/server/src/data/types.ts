export type RoleName = 'ADMIN' | 'TECHNICIAN' | 'TEACHER' | 'STUDENT';

export interface Role {
  id: number;
  role_name: RoleName;
  description: string;
}

export type Permission = 
  | 'MANAGE_DEVICES'
  | 'MANAGE_ROOMS'
  | 'VIEW_REPORTS'
  | 'ASSIGN_REPORTS'
  | 'RESOLVE_REPORTS'
  | 'GRANT_PERMISSIONS'
  | 'CREATE_REPORT';

export const ALL_PERMISSIONS: Permission[] = [
  'MANAGE_DEVICES',
  'MANAGE_ROOMS',
  'VIEW_REPORTS',
  'ASSIGN_REPORTS',
  'RESOLVE_REPORTS',
  'GRANT_PERMISSIONS',
  'CREATE_REPORT'
];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  ADMIN: [
    'MANAGE_DEVICES',
    'MANAGE_ROOMS',
    'VIEW_REPORTS',
    'ASSIGN_REPORTS',
    'RESOLVE_REPORTS',
    'GRANT_PERMISSIONS',
    'CREATE_REPORT'
  ],
  TECHNICIAN: [
    'MANAGE_DEVICES',
    'VIEW_REPORTS',
    'RESOLVE_REPORTS',
    'CREATE_REPORT'
  ],
  TEACHER: [
    'VIEW_REPORTS',
    'CREATE_REPORT'
  ],
  STUDENT: [
    'CREATE_REPORT'
  ]
};

export interface User {
  id: number;
  username: string;
  role_name: 'ADMIN' | 'TECHNICIAN' | 'TEACHER' | 'STUDENT';
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  password_hash?: string;
  permissions: Permission[];
  created_at: string;
}

export interface CampusPOI {
  id: string;
  name: string;
  category: 'GATE' | 'PARKING' | 'CANTEEN' | 'LIBRARY' | 'SPORTS' | 'ADMIN' | 'GARDEN';
  x: number;
  y: number;
  description?: string;
}

export interface Building {
  id: number;
  building_code: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  color: string;
  entrance_x: number;
  entrance_y: number;
}

export interface Room {
  id: number;
  building_id: number;
  building_code?: string;
  room_number: string;
  name: string;
  floor: number;
  qr_code: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  room_type: 'CLASSROOM' | 'LAB' | 'HALL' | 'STAIRS' | 'WC' | 'ELEVATOR' | 'OFFICE';
  door_x: number;
  door_y: number;
  devices?: Device[];
  pendingReportsCount?: number;
}

export interface DeviceCategory {
  id: number;
  category_name: string;
  code: string;
  icon: string;
  description: string;
}

export interface Device {
  id: number;
  room_id: number | null;
  category_id: number;
  device_code: string;
  name: string;
  model: string;
  serial_number: string;
  status: 'ACTIVE' | 'DAMAGED' | 'UNDER_MAINTENANCE' | 'LIQUIDATED';
  is_portable: boolean;
  qr_code: string;
  purchase_date: string;
  warranty_expiry: string;
  image_url?: string;
  specifications?: Record<string, string>;
  room_name?: string;
  category_name?: string;
  manual?: Manual | null;
  history?: MaintenanceLog[];
}

export interface FAQItem {
  problem: string;
  solution: string;
  quick_action?: string;
}

export interface Manual {
  id: number;
  category_id: number;
  device_id: number | null;
  device_code?: string;
  title: string;
  summary: string;
  content_markdown: string;
  video_url?: string;
  image_url?: string;
  quick_faq: FAQItem[];
  created_at: string;
}

export interface IncidentReport {
  id: number;
  report_code: string;
  room_id: number;
  device_id: number | null;
  reporter_name: string;
  reporter_phone: string;
  reporter_role: string;
  title: string;
  description: string;
  image_urls: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  assigned_technician_name?: string;
  solution_note?: string;
  created_at: string;
  resolved_at?: string;
  room_name?: string;
  device_name?: string;
}

export interface MaintenanceLog {
  id: number;
  report_id: number | null;
  device_id: number;
  technician_name: string;
  action_taken: string;
  parts_replaced: string;
  cost: number;
  performed_at: string;
  note?: string;
  device_name?: string;
}

export interface DashboardStats {
  totalRooms: number;
  totalDevices: number;
  activeDevices: number;
  damagedDevices: number;
  underMaintenanceDevices: number;
  pendingReports: number;
  resolvedReports: number;
  deviceHealthRatio: number;
}

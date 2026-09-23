import sql from 'mssql';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  Building,
  Room,
  DeviceCategory,
  Device,
  Manual,
  IncidentReport,
  MaintenanceLog,
  User,
  CampusPOI,
  RoleName,
  DEFAULT_ROLE_PERMISSIONS
} from './types';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER || 'bien',
  password: process.env.DB_PASSWORD || '123456',
  server: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '1434', 10),
  database: process.env.DB_NAME || 'quanlythietbi',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    // Tắt tính năng keepalive thủ công, để pool tự quản lý
    connectTimeout: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,          // Cho phép pool về 0 khi nhàn rỗi, tránh idle connection bị server kill
    idleTimeoutMillis: 10000,  // Đóng connection idle sau 10s (ngắn hơn SQL Server timeout)
    acquireTimeoutMillis: 30000
  }
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;
let activePool: sql.ConnectionPool | null = null;
let resetPromise: Promise<void> | null = null;
// The local SQL Server occasionally drops a pooled connection when several
// browser requests arrive simultaneously. Serialize lightweight app queries so
// a refresh cannot race a pool reset and return partial data.
let queryTail: Promise<void> = Promise.resolve();

async function runSqlQuerySerially<T>(operation: () => Promise<T>): Promise<T> {
  const previous = queryTail;
  let releaseCurrent!: () => void;
  queryTail = new Promise<void>(resolve => {
    releaseCurrent = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    releaseCurrent();
  }
}

export class SqlDatabase {
  static async connect(): Promise<sql.ConnectionPool> {
    if (!poolPromise) {
      const pool = new sql.ConnectionPool(config);
      poolPromise = pool.connect()
        .then(pool => {
          activePool = pool;
          pool.on('error', err => {
            // One reset is enough for a failed pool. Ignoring follow-up error
            // events prevents the reconnect log storm seen after ECONNRESET.
            if (activePool !== pool) return;
            console.warn('SQL connection was lost; reconnecting on the next request:', err.message);
            void SqlDatabase.resetPool(pool);
          });
          console.log('✅ SQL Server connected successfully');
          return pool;
        })
        .catch(err => {
          poolPromise = null;
          console.error('❌ SQL connect error:', err.message);
          throw err;
        });
    }
    return poolPromise;
  }

  private static async resetPool(pool?: sql.ConnectionPool): Promise<void> {
    if (pool && activePool !== pool) return;
    // A page refresh issues several queries at once. They must share one pool
    // reset, otherwise every failed request closes the replacement pool again.
    if (resetPromise) return resetPromise;
    const poolToClose = pool || activePool;
    activePool = null;
    poolPromise = null;
    resetPromise = Promise.resolve(poolToClose?.close())
      .catch(() => undefined)
      .then(() => undefined)
      .finally(() => {
        resetPromise = null;
      });
    return resetPromise;
  }

  /**
   * Thực thi SQL query với tự động retry khi gặp ECONNRESET.
   * Retry tối đa 2 lần trước khi báo lỗi thật sự.
   */
  static async query<T = any>(text: string, params: Record<string, any> = {}, retries = 2): Promise<T[]> {
    return runSqlQuerySerially(() => SqlDatabase.executeQuery<T>(text, params, retries));
  }

  private static async executeQuery<T = any>(text: string, params: Record<string, any> = {}, retries = 2): Promise<T[]> {
    try {
      const pool = await this.connect();
      const request = pool.request();
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
      const result = await request.query(text);
      return (result.recordset || []) as T[];
    } catch (err: any) {
      // Nếu là lỗi kết nối (ECONNRESET, ESOCKET...) thì reset pool và retry
      const message = String(err?.message || '');
      const isConnectionError = err?.code === 'ESOCKET' || err?.code === 'ECONNRESET' ||
        /ECONNRESET|Connection lost|Connection is closing|\baborted\b/i.test(message);

      if (isConnectionError) {
        console.warn(`⚠️ SQL connection reset, resetting pool... (${retries} retries left)`);
        await SqlDatabase.resetPool();
        if (retries > 0) {
          // Let the single reset finish before all API requests reconnect.
          await new Promise(resolve => setTimeout(resolve, 250));
          return SqlDatabase.executeQuery<T>(text, params, retries - 1);
        }
      }

      console.error('SQL query error:', err?.message || err);
      throw err;
    }
  }

  static async one<T = any>(text: string, params: Record<string, any> = {}): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length ? rows[0] : null;
  }

  // ================= DASHBOARD STATS =================
  static async getDashboardStats() {
    const row = await SqlDatabase.one<any>(`
      SELECT
        (SELECT COUNT(*) FROM dbo.PhongHoc) AS totalRooms,
        (SELECT COUNT(*) FROM dbo.ThietBi) AS totalDevices,
        (SELECT COUNT(*) FROM dbo.ThietBi WHERE TrangThai = N'ACTIVE') AS activeDevices,
        (SELECT COUNT(*) FROM dbo.ThietBi WHERE TrangThai = N'DAMAGED') AS damagedDevices,
        (SELECT COUNT(*) FROM dbo.ThietBi WHERE TrangThai = N'UNDER_MAINTENANCE') AS underMaintenanceDevices,
        (SELECT COUNT(*) FROM dbo.BaoHong WHERE TrangThai = N'PENDING') AS pendingReports,
        (SELECT COUNT(*) FROM dbo.BaoHong WHERE TrangThai = N'RESOLVED') AS resolvedReports
    `);

    const stats = row || {
      totalRooms: 0,
      totalDevices: 0,
      activeDevices: 0,
      damagedDevices: 0,
      underMaintenanceDevices: 0,
      pendingReports: 0,
      resolvedReports: 0
    };

    const totalDevices = Number(stats.totalDevices) || 0;
    const activeDevices = Number(stats.activeDevices) || 0;
    const deviceHealthRatio = totalDevices ? Math.round((activeDevices / totalDevices) * 100) : 100;

    return {
      totalRooms: Number(stats.totalRooms) || 0,
      totalDevices,
      activeDevices,
      damagedDevices: Number(stats.damagedDevices) || 0,
      underMaintenanceDevices: Number(stats.underMaintenanceDevices) || 0,
      pendingReports: Number(stats.pendingReports) || 0,
      resolvedReports: Number(stats.resolvedReports) || 0,
      deviceHealthRatio
    };
  }

  // ================= CAMPUS POIS =================
  static async getPois(): Promise<CampusPOI[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        DiemNoiBatID AS id,
        MaDiem AS poi_code,
        TenDiem AS name,
        LoaiDiem AS category,
        MoTa AS description,
        CAST(X AS float) AS x,
        CAST(Y AS float) AS y,
        CAST(Latitude AS float) AS latitude,
        CAST(Longitude AS float) AS longitude
      FROM dbo.DiemNoiBat
      ORDER BY DiemNoiBatID
    `);
    return rows;
  }

  // ================= BUILDINGS =================
  static async getBuildings(): Promise<Building[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        ToaNhaID AS id,
        MaToaNha AS building_code,
        TenToaNha AS name,
        MoTa AS description,
        CAST(X AS float) AS x,
        CAST(Y AS float) AS y,
        CAST(ChieuRong AS float) AS width,
        CAST(ChieuCao AS float) AS height,
        SoTang AS floors,
        MauSac AS color,
        CAST(XiengVaoX AS float) AS entrance_x,
        CAST(XiengVaoY AS float) AS entrance_y,
        CAST(Latitude AS float) AS latitude,
        CAST(Longitude AS float) AS longitude
      FROM dbo.ToaNha
      ORDER BY ToaNhaID
    `);
    return rows;
  }

  static async getBuildingById(id: number): Promise<Building | null> {
    return SqlDatabase.one<Building>(`
      SELECT
        ToaNhaID AS id,
        MaToaNha AS building_code,
        TenToaNha AS name,
        MoTa AS description,
        CAST(X AS float) AS x,
        CAST(Y AS float) AS y,
        CAST(ChieuRong AS float) AS width,
        CAST(ChieuCao AS float) AS height,
        SoTang AS floors,
        MauSac AS color,
        CAST(XiengVaoX AS float) AS entrance_x,
        CAST(XiengVaoY AS float) AS entrance_y,
        CAST(Latitude AS float) AS latitude,
        CAST(Longitude AS float) AS longitude
      FROM dbo.ToaNha
      WHERE ToaNhaID = @id
    `, { id });
  }

  static async addBuilding(payload: Omit<Building, 'id'>): Promise<Building> {
    const result = await SqlDatabase.query<any>(`
      INSERT INTO dbo.ToaNha (
        MaToaNha, TenToaNha, MoTa, X, Y, ChieuRong, ChieuCao,
        SoTang, MauSac, XiengVaoX, XiengVaoY, Latitude, Longitude, NgayTao
      )
      OUTPUT INSERTED.ToaNhaID AS id
      VALUES (
        @building_code, @name, @description, @x, @y, @width, @height,
        @floors, @color, @entrance_x, @entrance_y, @latitude, @longitude, GETDATE()
      )
    `, payload);

    return (await SqlDatabase.getBuildingById(result[0].id)) as Building;
  }

  static async updateBuilding(id: number, payload: Partial<Building>): Promise<Building | null> {
    await SqlDatabase.query(`
      UPDATE dbo.ToaNha SET
        MaToaNha = COALESCE(@building_code, MaToaNha), TenToaNha = COALESCE(@name, TenToaNha),
        MoTa = COALESCE(@description, MoTa), SoTang = COALESCE(@floors, SoTang), MauSac = COALESCE(@color, MauSac),
        Latitude = COALESCE(@latitude, Latitude), Longitude = COALESCE(@longitude, Longitude)
      WHERE ToaNhaID = @id
    `, { id, building_code: payload.building_code ?? null, name: payload.name ?? null, description: payload.description ?? null, floors: payload.floors ?? null, color: payload.color ?? null, latitude: payload.latitude ?? null, longitude: payload.longitude ?? null });
    return SqlDatabase.getBuildingById(id);
  }

  static async deleteBuilding(id: number): Promise<boolean> {
    const pool = await SqlDatabase.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const result = await new sql.Request(transaction).input('id', id).query(`
        UPDATE dbo.ThietBi SET PhongHocID = NULL WHERE PhongHocID IN (SELECT PhongHocID FROM dbo.PhongHoc WHERE ToaNhaID = @id);
        UPDATE dbo.BaoHong SET PhongHocID = NULL WHERE PhongHocID IN (SELECT PhongHocID FROM dbo.PhongHoc WHERE ToaNhaID = @id);
        DELETE FROM dbo.PhongHoc WHERE ToaNhaID = @id;
        DELETE FROM dbo.ToaNha WHERE ToaNhaID = @id;
        SELECT @@ROWCOUNT AS deletedCount;
      `);
      await transaction.commit();
      return Number(result.recordset?.[0]?.deletedCount || 0) === 1;
    } catch (error) { await transaction.rollback().catch(() => undefined); throw error; }
  }

  // ================= ROOMS =================
  static async getRooms(buildingId?: number, floor?: number): Promise<Room[]> {
    let query = `
      SELECT
        p.PhongHocID AS id,
        p.ToaNhaID AS building_id,
        p.SoPhong AS room_number,
        p.TenPhong AS name,
        p.Tang AS floor,
        p.MaQR AS qr_code,
        p.TrangThai AS status,
        p.MoTa AS description,
        p.LoaiPhong AS room_type,
        CAST(p.X AS float) AS x,
        CAST(p.Y AS float) AS y,
        CAST(p.ChieuRong AS float) AS width,
        CAST(p.ChieuCao AS float) AS height,
        CAST(p.CuaX AS float) AS door_x,
        CAST(p.CuaY AS float) AS door_y,
        CAST(p.Latitude AS float) AS latitude,
        CAST(p.Longitude AS float) AS longitude,
        t.MaToaNha AS building_code,
        (
          SELECT COUNT(*) 
          FROM dbo.BaoHong bh 
          WHERE bh.PhongHocID = p.PhongHocID 
            AND bh.TrangThai IN (N'PENDING', N'ASSIGNED', N'IN_PROGRESS')
        ) AS pendingReportsCount
      FROM dbo.PhongHoc p
      LEFT JOIN dbo.ToaNha t ON t.ToaNhaID = p.ToaNhaID
      WHERE 1 = 1
    `;

    const params: Record<string, any> = {};
    if (buildingId) {
      query += ` AND p.ToaNhaID = @buildingId`;
      params.buildingId = buildingId;
    }
    if (floor) {
      query += ` AND p.Tang = @floor`;
      params.floor = floor;
    }

    query += ` ORDER BY p.Tang, p.SoPhong`;
    return SqlDatabase.query<Room>(query, params);
  }

  static async getRoomById(id: number): Promise<(Room & { devices: Device[]; pendingReportsCount: number }) | null> {
    const room = await SqlDatabase.one<any>(`
      SELECT
        p.PhongHocID AS id,
        p.ToaNhaID AS building_id,
        p.SoPhong AS room_number,
        p.TenPhong AS name,
        p.Tang AS floor,
        p.MaQR AS qr_code,
        p.TrangThai AS status,
        p.MoTa AS description,
        p.LoaiPhong AS room_type,
        CAST(p.X AS float) AS x,
        CAST(p.Y AS float) AS y,
        CAST(p.ChieuRong AS float) AS width,
        CAST(p.ChieuCao AS float) AS height,
        CAST(p.CuaX AS float) AS door_x,
        CAST(p.CuaY AS float) AS door_y,
        CAST(p.Latitude AS float) AS latitude,
        CAST(p.Longitude AS float) AS longitude,
        t.MaToaNha AS building_code,
        (
          SELECT COUNT(*) 
          FROM dbo.BaoHong bh 
          WHERE bh.PhongHocID = p.PhongHocID 
            AND bh.TrangThai IN (N'PENDING', N'ASSIGNED', N'IN_PROGRESS')
        ) AS pendingReportsCount
      FROM dbo.PhongHoc p
      LEFT JOIN dbo.ToaNha t ON t.ToaNhaID = p.ToaNhaID
      WHERE p.PhongHocID = @id
    `, { id });

    if (!room) return null;

    const devices = await SqlDatabase.getDevicesByRoomId(id);
    return { ...room, devices, pendingReportsCount: room.pendingReportsCount || 0 };
  }

  static async getRoomByQr(qrCode: string): Promise<Room | null> {
    return SqlDatabase.one<Room>(`
      SELECT
        p.PhongHocID AS id,
        p.ToaNhaID AS building_id,
        p.SoPhong AS room_number,
        p.TenPhong AS name,
        p.Tang AS floor,
        p.MaQR AS qr_code,
        p.TrangThai AS status,
        p.MoTa AS description,
        p.LoaiPhong AS room_type,
        CAST(p.X AS float) AS x,
        CAST(p.Y AS float) AS y,
        CAST(p.ChieuRong AS float) AS width,
        CAST(p.ChieuCao AS float) AS height,
        CAST(p.CuaX AS float) AS door_x,
        CAST(p.CuaY AS float) AS door_y,
        CAST(p.Latitude AS float) AS latitude,
        CAST(p.Longitude AS float) AS longitude,
        t.MaToaNha AS building_code
      FROM dbo.PhongHoc p
      LEFT JOIN dbo.ToaNha t ON t.ToaNhaID = p.ToaNhaID
      WHERE LOWER(p.MaQR) = LOWER(@qrCode)
    `, { qrCode });
  }

  static async addRoom(payload: Omit<Room, 'id' | 'devices' | 'pendingReportsCount' | 'building_code'>): Promise<Room> {
    const normalizedCode = String(payload.room_number || 'NEW').trim().toUpperCase().replace(/\s+/g, '-');
    const qr_code = payload.qr_code || `QR-ROOM-${normalizedCode}`;

    const res = await SqlDatabase.query<any>(`
      INSERT INTO dbo.PhongHoc (
        ToaNhaID, SoPhong, TenPhong, Tang, MaQR, TrangThai, MoTa, LoaiPhong,
        X, Y, ChieuRong, ChieuCao, CuaX, CuaY, Latitude, Longitude, NgayTao
      )
      OUTPUT INSERTED.PhongHocID AS id
      VALUES (
        @building_id, @room_number, @name, @floor, @qr_code, @status, @description, @room_type,
        @x, @y, @width, @height, @door_x, @door_y, @latitude, @longitude, GETDATE()
      )
    `, {
      building_id: payload.building_id,
      room_number: payload.room_number,
      name: payload.name,
      floor: payload.floor,
      qr_code,
      status: payload.status || 'ACTIVE',
      description: payload.description || '',
      room_type: payload.room_type || 'CLASSROOM',
      x: payload.x ?? 0,
      y: payload.y ?? 0,
      width: payload.width ?? 180,
      height: payload.height ?? 130,
      door_x: payload.door_x ?? 20,
      door_y: payload.door_y ?? 70,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null
    });

    const newId = res[0]?.id;
    return (await SqlDatabase.getRoomById(newId)) as Room;
  }

  static async updateRoom(id: number, payload: Partial<Room>): Promise<Room | null> {
    const existing = await SqlDatabase.getRoomById(id);
    if (!existing) return null;

    await SqlDatabase.query(`
      UPDATE dbo.PhongHoc
      SET
        ToaNhaID = COALESCE(@building_id, ToaNhaID),
        SoPhong = COALESCE(@room_number, SoPhong),
        TenPhong = COALESCE(@name, TenPhong),
        Tang = COALESCE(@floor, Tang),
        MaQR = COALESCE(@qr_code, MaQR),
        TrangThai = COALESCE(@status, TrangThai),
        MoTa = COALESCE(@description, MoTa),
        LoaiPhong = COALESCE(@room_type, LoaiPhong),
        X = COALESCE(@x, X),
        Y = COALESCE(@y, Y),
        ChieuRong = COALESCE(@width, ChieuRong),
        ChieuCao = COALESCE(@height, ChieuCao),
        CuaX = COALESCE(@door_x, CuaX),
        CuaY = COALESCE(@door_y, CuaY),
        Latitude = COALESCE(@latitude, Latitude),
        Longitude = COALESCE(@longitude, Longitude)
      WHERE PhongHocID = @id
    `, {
      id,
      building_id: payload.building_id ?? null,
      room_number: payload.room_number ?? null,
      name: payload.name ?? null,
      floor: payload.floor ?? null,
      qr_code: payload.qr_code ?? null,
      status: payload.status ?? null,
      description: payload.description ?? null,
      room_type: payload.room_type ?? null,
      x: payload.x ?? null,
      y: payload.y ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      door_x: payload.door_x ?? null,
      door_y: payload.door_y ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null
    });

    return SqlDatabase.getRoomById(id);
  }

  static async deleteRoom(id: number): Promise<boolean> {
    // A room is referenced by both equipment and incident reports.  Keep these
    // updates and the delete in one transaction so a failed delete cannot leave
    // the database in a partially updated state.
    const pool = await SqlDatabase.connect();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    try {
      const request = new sql.Request(transaction);
      request.input('id', id);
      const result = await request.query(`
        UPDATE dbo.ThietBi SET PhongHocID = NULL WHERE PhongHocID = @id;
        UPDATE dbo.BaoHong SET PhongHocID = NULL WHERE PhongHocID = @id;
        DELETE FROM dbo.PhongHoc WHERE PhongHocID = @id;
        SELECT @@ROWCOUNT AS deletedCount;
      `);

      await transaction.commit();
      return Number(result.recordset?.[0]?.deletedCount || 0) === 1;
    } catch (error) {
      // A failed SQL statement may already have aborted the transaction.
      // Rolling back is still safe; ignore the "not begun" case.
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  }

  // ================= CATEGORIES =================
  static async getCategories(): Promise<DeviceCategory[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        LoaiThietBiID AS id,
        MaLoai AS code,
        TenLoai AS category_name,
        MoTa AS description,
        CASE MaLoai
          WHEN 'MIC' THEN 'Mic'
          WHEN 'PROJECTOR' THEN 'Tv'
          WHEN 'AMPLIFIER' THEN 'Speaker'
          WHEN 'AC' THEN 'Wind'
          ELSE 'Cpu'
        END AS icon
      FROM dbo.LoaiThietBi
      ORDER BY LoaiThietBiID
    `);
    return rows;
  }

  // ================= DEVICES =================
  static async getDevices(categoryId?: number, status?: string): Promise<Device[]> {
    let query = `
      SELECT
        d.ThietBiID AS id,
        d.PhongHocID AS room_id,
        d.LoaiThietBiID AS category_id,
        d.MaThietBi AS device_code,
        d.TenThietBi AS name,
        d.Model AS model,
        d.SerialNumber AS serial_number,
        d.ViTri AS location,
        d.TrangThai AS status,
        d.MaQR AS qr_code,
        d.MoTa AS description,
        CONVERT(varchar(19), d.NgayTao, 120) AS created_at,
        c.TenLoai AS category_name,
        COALESCE(p.SoPhong, N'Kho lưu động') AS room_name,
        CAST(0 AS bit) AS is_portable,
        CONVERT(varchar(10), d.NgayTao, 120) AS purchase_date,
        CONVERT(varchar(10), DATEADD(year, 2, d.NgayTao), 120) AS warranty_expiry
      FROM dbo.ThietBi d
      LEFT JOIN dbo.LoaiThietBi c ON c.LoaiThietBiID = d.LoaiThietBiID
      LEFT JOIN dbo.PhongHoc p ON p.PhongHocID = d.PhongHocID
      WHERE 1 = 1
    `;

    const params: Record<string, any> = {};
    if (categoryId) {
      query += ` AND d.LoaiThietBiID = @categoryId`;
      params.categoryId = categoryId;
    }
    if (status) {
      query += ` AND d.TrangThai = @status`;
      params.status = status;
    }

    query += ` ORDER BY d.ThietBiID`;
    return SqlDatabase.query<Device>(query, params);
  }

  static async getDevicesByRoomId(roomId: number): Promise<Device[]> {
    return SqlDatabase.query<Device>(`
      SELECT
        d.ThietBiID AS id,
        d.PhongHocID AS room_id,
        d.LoaiThietBiID AS category_id,
        d.MaThietBi AS device_code,
        d.TenThietBi AS name,
        d.Model AS model,
        d.SerialNumber AS serial_number,
        d.ViTri AS location,
        d.TrangThai AS status,
        d.MaQR AS qr_code,
        d.MoTa AS description,
        CONVERT(varchar(19), d.NgayTao, 120) AS created_at,
        c.TenLoai AS category_name,
        COALESCE(p.SoPhong, N'Kho lưu động') AS room_name,
        CAST(0 AS bit) AS is_portable,
        CONVERT(varchar(10), d.NgayTao, 120) AS purchase_date,
        CONVERT(varchar(10), DATEADD(year, 2, d.NgayTao), 120) AS warranty_expiry
      FROM dbo.ThietBi d
      LEFT JOIN dbo.LoaiThietBi c ON c.LoaiThietBiID = d.LoaiThietBiID
      LEFT JOIN dbo.PhongHoc p ON p.PhongHocID = d.PhongHocID
      WHERE d.PhongHocID = @roomId
      ORDER BY d.ThietBiID
    `, { roomId });
  }

  static async getDeviceById(id: number): Promise<(Device & { manual?: Manual | null; history?: MaintenanceLog[] }) | null> {
    const dev = await SqlDatabase.one<any>(`
      SELECT
        d.ThietBiID AS id,
        d.PhongHocID AS room_id,
        d.LoaiThietBiID AS category_id,
        d.MaThietBi AS device_code,
        d.TenThietBi AS name,
        d.Model AS model,
        d.SerialNumber AS serial_number,
        d.ViTri AS location,
        d.TrangThai AS status,
        d.MaQR AS qr_code,
        d.MoTa AS description,
        CONVERT(varchar(19), d.NgayTao, 120) AS created_at,
        c.TenLoai AS category_name,
        COALESCE(p.SoPhong, N'Kho lưu động') AS room_name,
        CAST(0 AS bit) AS is_portable,
        CONVERT(varchar(10), d.NgayTao, 120) AS purchase_date,
        CONVERT(varchar(10), DATEADD(year, 2, d.NgayTao), 120) AS warranty_expiry
      FROM dbo.ThietBi d
      LEFT JOIN dbo.LoaiThietBi c ON c.LoaiThietBiID = d.LoaiThietBiID
      LEFT JOIN dbo.PhongHoc p ON p.PhongHocID = d.PhongHocID
      WHERE d.ThietBiID = @id
    `, { id });

    if (!dev) return null;

    const manual = await SqlDatabase.getManualByDeviceId(id);
    const history = await SqlDatabase.getMaintenanceLogsByDeviceId(id);

    return { ...dev, manual: manual || null, history };
  }

  static async getDeviceByQr(qrCode: string): Promise<Device | null> {
    return SqlDatabase.one<Device>(`
      SELECT
        d.ThietBiID AS id,
        d.PhongHocID AS room_id,
        d.LoaiThietBiID AS category_id,
        d.MaThietBi AS device_code,
        d.TenThietBi AS name,
        d.Model AS model,
        d.SerialNumber AS serial_number,
        d.ViTri AS location,
        d.TrangThai AS status,
        d.MaQR AS qr_code,
        d.MoTa AS description,
        CONVERT(varchar(19), d.NgayTao, 120) AS created_at,
        c.TenLoai AS category_name,
        COALESCE(p.SoPhong, N'Kho lưu động') AS room_name,
        CAST(0 AS bit) AS is_portable,
        CONVERT(varchar(10), d.NgayTao, 120) AS purchase_date,
        CONVERT(varchar(10), DATEADD(year, 2, d.NgayTao), 120) AS warranty_expiry
      FROM dbo.ThietBi d
      LEFT JOIN dbo.LoaiThietBi c ON c.LoaiThietBiID = d.LoaiThietBiID
      LEFT JOIN dbo.PhongHoc p ON p.PhongHocID = d.PhongHocID
      WHERE LOWER(d.MaQR) = LOWER(@qrCode)
    `, { qrCode });
  }

  static async addDevice(payload: Omit<Device, 'id'>): Promise<Device> {
    const qr_code = payload.qr_code || `QR-EQ-${payload.device_code}`;

    const res = await SqlDatabase.query<any>(`
      INSERT INTO dbo.ThietBi (
        PhongHocID, LoaiThietBiID, MaThietBi, TenThietBi, Model, SerialNumber,
        ViTri, TrangThai, MaQR, MoTa, NgayTao
      )
      OUTPUT INSERTED.ThietBiID AS id
      VALUES (
        @room_id, @category_id, @device_code, @name, @model, @serial_number,
        @location, @status, @qr_code, @description, GETDATE()
      )
    `, {
      room_id: payload.room_id || null,
      category_id: payload.category_id,
      device_code: payload.device_code,
      name: payload.name,
      model: payload.model || '',
      serial_number: payload.serial_number || '',
      location: payload.location || '',
      status: payload.status || 'ACTIVE',
      qr_code,
      description: payload.description || ''
    });

    const newId = res[0]?.id;
    return (await SqlDatabase.getDeviceById(newId)) as Device;
  }

  static async updateDevice(id: number, payload: Partial<Device>): Promise<Device | null> {
    await SqlDatabase.query(`
      UPDATE dbo.ThietBi
      SET
        PhongHocID = COALESCE(@room_id, PhongHocID),
        LoaiThietBiID = COALESCE(@category_id, LoaiThietBiID),
        MaThietBi = COALESCE(@device_code, MaThietBi),
        TenThietBi = COALESCE(@name, TenThietBi),
        Model = COALESCE(@model, Model),
        SerialNumber = COALESCE(@serial_number, SerialNumber),
        ViTri = COALESCE(@location, ViTri),
        TrangThai = COALESCE(@status, TrangThai),
        MaQR = COALESCE(@qr_code, MaQR),
        MoTa = COALESCE(@description, MoTa)
      WHERE ThietBiID = @id
    `, {
      id,
      room_id: payload.room_id !== undefined ? payload.room_id : null,
      category_id: payload.category_id ?? null,
      device_code: payload.device_code ?? null,
      name: payload.name ?? null,
      model: payload.model ?? null,
      serial_number: payload.serial_number ?? null,
      location: payload.location ?? null,
      status: payload.status ?? null,
      qr_code: payload.qr_code ?? null,
      description: payload.description ?? null
    });

    return SqlDatabase.getDeviceById(id);
  }

  static async updateDeviceStatus(id: number, status: Device['status']): Promise<Device | null> {
    await SqlDatabase.query(`
      UPDATE dbo.ThietBi SET TrangThai = @status WHERE ThietBiID = @id
    `, { id, status });
    return SqlDatabase.getDeviceById(id);
  }

  static async deleteDevice(id: number): Promise<boolean> {
    await SqlDatabase.query(`
      DELETE FROM dbo.HuongDanSuDung WHERE ThietBiID = @id;
      DELETE FROM dbo.LogBaoTri WHERE BaoHongID IN (SELECT BaoHongID FROM dbo.BaoHong WHERE ThietBiID = @id);
      UPDATE dbo.BaoHong SET ThietBiID = NULL WHERE ThietBiID = @id;
      DELETE FROM dbo.ThietBi WHERE ThietBiID = @id;
    `, { id });
    return true;
  }

  // ================= MANUALS =================
  static async getManuals(): Promise<Manual[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        h.HuongDanID AS id,
        COALESCE(t.LoaiThietBiID, 1) AS category_id,
        h.ThietBiID AS device_id,
        t.MaThietBi AS device_code,
        h.TieuDe AS title,
        SUBSTRING(h.NoiDung, 1, 150) AS summary,
        h.NoiDung AS content_markdown,
        CONVERT(varchar(19), h.NgayTao, 120) AS created_at
      FROM dbo.HuongDanSuDung h
      LEFT JOIN dbo.ThietBi t ON t.ThietBiID = h.ThietBiID
      ORDER BY h.HuongDanID
    `);

    return rows.map(r => ({
      ...r,
      quick_faq: []
    }));
  }

  static async getManualById(id: number): Promise<Manual | null> {
    const row = await SqlDatabase.one<any>(`
      SELECT
        h.HuongDanID AS id,
        COALESCE(t.LoaiThietBiID, 1) AS category_id,
        h.ThietBiID AS device_id,
        t.MaThietBi AS device_code,
        h.TieuDe AS title,
        SUBSTRING(h.NoiDung, 1, 150) AS summary,
        h.NoiDung AS content_markdown,
        CONVERT(varchar(19), h.NgayTao, 120) AS created_at
      FROM dbo.HuongDanSuDung h
      LEFT JOIN dbo.ThietBi t ON t.ThietBiID = h.ThietBiID
      WHERE h.HuongDanID = @id
    `, { id });

    return row ? { ...row, quick_faq: [] } : null;
  }

  static async getManualByDeviceId(deviceId: number): Promise<Manual | null> {
    const row = await SqlDatabase.one<any>(`
      SELECT
        h.HuongDanID AS id,
        COALESCE(t.LoaiThietBiID, 1) AS category_id,
        h.ThietBiID AS device_id,
        t.MaThietBi AS device_code,
        h.TieuDe AS title,
        SUBSTRING(h.NoiDung, 1, 150) AS summary,
        h.NoiDung AS content_markdown,
        CONVERT(varchar(19), h.NgayTao, 120) AS created_at
      FROM dbo.HuongDanSuDung h
      LEFT JOIN dbo.ThietBi t ON t.ThietBiID = h.ThietBiID
      WHERE h.ThietBiID = @deviceId
    `, { deviceId });

    return row ? { ...row, quick_faq: [] } : null;
  }

  // ================= INCIDENT REPORTS =================
  static async getIncidentReports(status?: string, roomId?: number): Promise<IncidentReport[]> {
    let query = `
      SELECT
        b.BaoHongID AS id,
        ('INC-' + CONVERT(varchar(8), b.NgayTao, 112) + '-' + RIGHT('000' + CAST(b.BaoHongID AS varchar), 3)) AS report_code,
        b.PhongHocID AS room_id,
        b.ThietBiID AS device_id,
        COALESCE(u.HoTen, N'Người dùng') AS reporter_name,
        COALESCE(u.SoDienThoai, N'Chưa cập nhật') AS reporter_phone,
        COALESCE(v.TenVaiTro, N'Giảng viên') AS reporter_role,
        b.TieuDe AS title,
        b.MoTa AS description,
        b.AnhURL AS image_url,
        b.MucDo AS priority,
        b.TrangThai AS status,
        ktv.HoTen AS assigned_technician_name,
        CONVERT(varchar(19), b.NgayTao, 120) AS created_at,
        CONVERT(varchar(19), b.NgayCapNhat, 120) AS resolved_at,
        p.SoPhong AS room_name,
        t.TenThietBi AS device_name
      FROM dbo.BaoHong b
      LEFT JOIN dbo.NguoiDung u ON u.NguoiDungID = b.NguoiBaoID
      LEFT JOIN dbo.VaiTro v ON v.VaiTroID = u.VaiTroID
      LEFT JOIN dbo.NguoiDung ktv ON ktv.NguoiDungID = b.KyThuatVienNhanID
      LEFT JOIN dbo.PhongHoc p ON p.PhongHocID = b.PhongHocID
      LEFT JOIN dbo.ThietBi t ON t.ThietBiID = b.ThietBiID
      WHERE 1 = 1
    `;

    const params: Record<string, any> = {};
    if (status) {
      query += ` AND b.TrangThai = @status`;
      params.status = status;
    }
    if (roomId) {
      query += ` AND b.PhongHocID = @roomId`;
      params.roomId = roomId;
    }

    query += ` ORDER BY b.BaoHongID DESC`;
    const rows = await SqlDatabase.query<any>(query, params);

    return rows.map(r => ({
      ...r,
      image_urls: r.image_url ? [r.image_url] : []
    }));
  }

  static async getIncidentReportById(id: number): Promise<IncidentReport | null> {
    const row = await SqlDatabase.one<any>(`
      SELECT
        b.BaoHongID AS id,
        ('INC-' + CONVERT(varchar(8), b.NgayTao, 112) + '-' + RIGHT('000' + CAST(b.BaoHongID AS varchar), 3)) AS report_code,
        b.PhongHocID AS room_id,
        b.ThietBiID AS device_id,
        COALESCE(u.HoTen, N'Người dùng') AS reporter_name,
        COALESCE(u.SoDienThoai, N'Chưa cập nhật') AS reporter_phone,
        COALESCE(v.TenVaiTro, N'Giảng viên') AS reporter_role,
        b.TieuDe AS title,
        b.MoTa AS description,
        b.AnhURL AS image_url,
        b.MucDo AS priority,
        b.TrangThai AS status,
        ktv.HoTen AS assigned_technician_name,
        CONVERT(varchar(19), b.NgayTao, 120) AS created_at,
        CONVERT(varchar(19), b.NgayCapNhat, 120) AS resolved_at,
        p.SoPhong AS room_name,
        t.TenThietBi AS device_name
      FROM dbo.BaoHong b
      LEFT JOIN dbo.NguoiDung u ON u.NguoiDungID = b.NguoiBaoID
      LEFT JOIN dbo.VaiTro v ON v.VaiTroID = u.VaiTroID
      LEFT JOIN dbo.NguoiDung ktv ON ktv.NguoiDungID = b.KyThuatVienNhanID
      LEFT JOIN dbo.PhongHoc p ON p.PhongHocID = b.PhongHocID
      LEFT JOIN dbo.ThietBi t ON t.ThietBiID = b.ThietBiID
      WHERE b.BaoHongID = @id
    `, { id });

    return row ? { ...row, image_urls: row.image_url ? [row.image_url] : [] } : null;
  }

  static async createIncidentReport(payload: {
    room_id: number;
    device_id?: number | null;
    reporter_name: string;
    reporter_phone: string;
    reporter_role?: string;
    title: string;
    description: string;
    image_urls?: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    reporter_id?: number;
  }): Promise<IncidentReport> {
    const firstImg = payload.image_urls && payload.image_urls.length ? payload.image_urls[0] : null;

    const res = await SqlDatabase.query<any>(`
      INSERT INTO dbo.BaoHong (
        NguoiBaoID, PhongHocID, ThietBiID, TieuDe, MoTa, AnhURL, MucDo, TrangThai, NgayTao, NgayCapNhat
      )
      OUTPUT INSERTED.BaoHongID AS id
      VALUES (
        @reporter_id, @room_id, @device_id, @title, @description, @image_url, @priority, N'PENDING', GETDATE(), GETDATE()
      )
    `, {
      reporter_id: payload.reporter_id || 1,
      room_id: payload.room_id,
      device_id: payload.device_id || null,
      title: payload.title,
      description: payload.description,
      image_url: firstImg,
      priority: payload.priority || 'MEDIUM'
    });

    const newId = res[0]?.id;

    if (payload.device_id) {
      await SqlDatabase.updateDeviceStatus(payload.device_id, 'DAMAGED');
    }

    return (await SqlDatabase.getIncidentReportById(newId)) as IncidentReport;
  }

  static async updateIncidentStatus(
    id: number,
    status: IncidentReport['status'],
    technicianId?: number,
    technicianName?: string,
    solutionNote?: string
  ): Promise<IncidentReport | null> {
    await SqlDatabase.query(`
      UPDATE dbo.BaoHong
      SET
        TrangThai = @status,
        KyThuatVienNhanID = COALESCE(@technicianId, KyThuatVienNhanID),
        NgayCapNhat = GETDATE()
      WHERE BaoHongID = @id
    `, {
      id,
      status,
      technicianId: technicianId || null
    });

    if (solutionNote) {
      await SqlDatabase.query(`
        INSERT INTO dbo.LogBaoTri (BaoHongID, KyThuatVienID, HanhDong, NgayTao)
        VALUES (@id, @technicianId, @action, GETDATE())
      `, {
        id,
        technicianId: technicianId || 2,
        action: solutionNote
      });
    }

    const report = await SqlDatabase.getIncidentReportById(id);
    if (status === 'RESOLVED' && report?.device_id) {
      await SqlDatabase.updateDeviceStatus(report.device_id, 'ACTIVE');
    }

    return report;
  }

  // ================= MAINTENANCE LOGS =================
  static async getMaintenanceLogs(): Promise<MaintenanceLog[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        l.LogBaoTriID AS id,
        l.BaoHongID AS report_id,
        COALESCE(b.ThietBiID, 1) AS device_id,
        u.HoTen AS technician_name,
        l.HanhDong AS action_taken,
        N'Linh kiện thay thế chuẩn' AS parts_replaced,
        0 AS cost,
        CONVERT(varchar(19), l.NgayTao, 120) AS performed_at,
        t.TenThietBi AS device_name
      FROM dbo.LogBaoTri l
      LEFT JOIN dbo.NguoiDung u ON u.NguoiDungID = l.KyThuatVienID
      LEFT JOIN dbo.BaoHong b ON b.BaoHongID = l.BaoHongID
      LEFT JOIN dbo.ThietBi t ON t.ThietBiID = b.ThietBiID
      ORDER BY l.LogBaoTriID DESC
    `);
    return rows;
  }

  static async getMaintenanceLogsByDeviceId(deviceId: number): Promise<MaintenanceLog[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        l.LogBaoTriID AS id,
        l.BaoHongID AS report_id,
        b.ThietBiID AS device_id,
        u.HoTen AS technician_name,
        l.HanhDong AS action_taken,
        N'Linh kiện chuẩn' AS parts_replaced,
        0 AS cost,
        CONVERT(varchar(19), l.NgayTao, 120) AS performed_at,
        t.TenThietBi AS device_name
      FROM dbo.LogBaoTri l
      LEFT JOIN dbo.NguoiDung u ON u.NguoiDungID = l.KyThuatVienID
      JOIN dbo.BaoHong b ON b.BaoHongID = l.BaoHongID
      JOIN dbo.ThietBi t ON t.ThietBiID = b.ThietBiID
      WHERE b.ThietBiID = @deviceId
      ORDER BY l.LogBaoTriID DESC
    `, { deviceId });
    return rows;
  }

  static async addMaintenanceLog(payload: {
    report_id?: number | null;
    device_id: number;
    technician_name?: string;
    technician_id?: number;
    action_taken: string;
    parts_replaced?: string;
    cost?: number;
  }): Promise<MaintenanceLog> {
    const res = await SqlDatabase.query<any>(`
      INSERT INTO dbo.LogBaoTri (BaoHongID, KyThuatVienID, HanhDong, NgayTao)
      OUTPUT INSERTED.LogBaoTriID AS id
      VALUES (@report_id, @technician_id, @action, GETDATE())
    `, {
      report_id: payload.report_id || null,
      technician_id: payload.technician_id || 2,
      action: payload.action_taken
    });

    const newId = res[0]?.id;
    return {
      id: newId,
      report_id: payload.report_id || null,
      device_id: payload.device_id,
      technician_name: payload.technician_name || 'KTV Kỹ thuật',
      action_taken: payload.action_taken,
      parts_replaced: payload.parts_replaced || '',
      cost: payload.cost || 0,
      performed_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
  }

  // ================= USERS & AUTH & RBAC =================
  private static formatUser(row: any): User {
    const roleName = (row.role_name as RoleName) || 'STUDENT';
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[roleName] || [];
    return {
      id: row.id,
      username: row.username,
      password_hash: row.password_hash,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone || '',
      avatar_url: row.avatar_url || '',
      role_name: roleName,
      permissions: defaultPerms,
      created_at: row.created_at || new Date().toISOString()
    };
  }

  static async getUsers(): Promise<Omit<User, 'password_hash'>[]> {
    const rows = await SqlDatabase.query<any>(`
      SELECT
        u.NguoiDungID AS id,
        u.TenDangNhap AS username,
        u.HoTen AS full_name,
        u.Email AS email,
        u.SoDienThoai AS phone,
        v.MaVaiTro AS role_name,
        CONVERT(varchar(19), u.NgayTao, 120) AS created_at
      FROM dbo.NguoiDung u
      LEFT JOIN dbo.VaiTro v ON v.VaiTroID = u.VaiTroID
      WHERE u.TenDangNhap <> N'system_deleted_account'
      ORDER BY u.NguoiDungID
    `);

    return rows.map(r => {
      const { password_hash, ...rest } = this.formatUser(r);
      return rest;
    });
  }

  static async getUserById(id: number): Promise<User | null> {
    const row = await SqlDatabase.one<any>(`
      SELECT
        u.NguoiDungID AS id,
        u.TenDangNhap AS username,
        u.MatKhauHash AS password_hash,
        u.HoTen AS full_name,
        u.Email AS email,
        u.SoDienThoai AS phone,
        v.MaVaiTro AS role_name,
        CONVERT(varchar(19), u.NgayTao, 120) AS created_at
      FROM dbo.NguoiDung u
      LEFT JOIN dbo.VaiTro v ON v.VaiTroID = u.VaiTroID
      WHERE u.NguoiDungID = @id
    `, { id });

    return row ? this.formatUser(row) : null;
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const row = await SqlDatabase.one<any>(`
      SELECT
        u.NguoiDungID AS id,
        u.TenDangNhap AS username,
        u.MatKhauHash AS password_hash,
        u.HoTen AS full_name,
        u.Email AS email,
        u.SoDienThoai AS phone,
        v.MaVaiTro AS role_name,
        CONVERT(varchar(19), u.NgayTao, 120) AS created_at
      FROM dbo.NguoiDung u
      LEFT JOIN dbo.VaiTro v ON v.VaiTroID = u.VaiTroID
      WHERE LOWER(u.TenDangNhap) = LOWER(@username)
    `, { username });

    return row ? this.formatUser(row) : null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const row = await SqlDatabase.one<any>(`
      SELECT
        u.NguoiDungID AS id,
        u.TenDangNhap AS username,
        u.MatKhauHash AS password_hash,
        u.HoTen AS full_name,
        u.Email AS email,
        u.SoDienThoai AS phone,
        v.MaVaiTro AS role_name,
        CONVERT(varchar(19), u.NgayTao, 120) AS created_at
      FROM dbo.NguoiDung u
      LEFT JOIN dbo.VaiTro v ON v.VaiTroID = u.VaiTroID
      WHERE LOWER(u.Email) = LOWER(@email)
    `, { email });

    return row ? this.formatUser(row) : null;
  }

  static async createUser(payload: {
    username: string;
    password_hash: string;
    full_name: string;
    email: string;
    phone?: string;
    role_name?: RoleName;
  }): Promise<User | null> {
    const role = payload.role_name || 'STUDENT';
    const roleRow = await SqlDatabase.one<any>(`
      SELECT VaiTroID FROM dbo.VaiTro WHERE MaVaiTro = @role
    `, { role });
    const vaiTroId = roleRow ? roleRow.VaiTroID : 5;

    const result = await SqlDatabase.query<any>(`
      INSERT INTO dbo.NguoiDung (
        TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, VaiTroID, TrangThai, NgayTao, NgayCapNhat
      )
      OUTPUT INSERTED.NguoiDungID AS id
      VALUES (
        @username, @password_hash, @full_name, @email, @phone, @vaiTroId, N'HOAT_DONG', GETDATE(), GETDATE()
      )
    `, {
      username: payload.username.trim(),
      password_hash: payload.password_hash,
      full_name: payload.full_name.trim(),
      email: payload.email.trim(),
      phone: payload.phone || '',
      vaiTroId
    });

    const id = result?.[0]?.id ?? null;
    return id ? SqlDatabase.getUserById(id) : null;
  }

  static async updateUserRole(userId: number, roleName: RoleName): Promise<User | null> {
    const roleRow = await SqlDatabase.one<any>(`
      SELECT VaiTroID FROM dbo.VaiTro WHERE MaVaiTro = @roleName
    `, { roleName });
    if (!roleRow) return null;

    await SqlDatabase.query(`
      UPDATE dbo.NguoiDung
      SET VaiTroID = @vaiTroId, NgayCapNhat = GETDATE()
      WHERE NguoiDungID = @userId
    `, { userId, vaiTroId: roleRow.VaiTroID });

    return SqlDatabase.getUserById(userId);
  }

  static async updateOwnPassword(userId: number, passwordHash: string): Promise<boolean> {
    const rows = await SqlDatabase.query<any>(`
      UPDATE dbo.NguoiDung SET MatKhauHash = @passwordHash, NgayCapNhat = GETDATE()
      WHERE NguoiDungID = @userId;
      SELECT @@ROWCOUNT AS changed;
    `, { userId, passwordHash });
    return Number(rows[0]?.changed || 0) === 1;
  }

  static async deleteUser(userId: number): Promise<boolean> {
    const pool = await SqlDatabase.connect();
    const transaction = new sql.Transaction(pool);
    const systemPasswordHash = await bcrypt.hash(`system-deleted-account:${Date.now()}`, 12);

    await transaction.begin();
    try {
      const request = new sql.Request(transaction);
      request.input('userId', userId);
      request.input('systemPasswordHash', systemPasswordHash);
      const result = await request.query(`
        DECLARE @systemUserId INT;
        DECLARE @studentRoleId INT;

        SELECT @systemUserId = NguoiDungID
        FROM dbo.NguoiDung
        WHERE TenDangNhap = N'system_deleted_account';

        IF @systemUserId IS NULL
        BEGIN
          SELECT @studentRoleId = VaiTroID FROM dbo.VaiTro WHERE MaVaiTro = N'STUDENT';
          INSERT INTO dbo.NguoiDung (
            TenDangNhap, MatKhauHash, HoTen, Email, SoDienThoai, VaiTroID, TrangThai, NgayTao, NgayCapNhat
          )
          VALUES (
            N'system_deleted_account', @systemPasswordHash, N'Tài khoản đã xóa',
            N'system-deleted-account@local.invalid', N'', @studentRoleId, N'HOAT_DONG', GETDATE(), GETDATE()
          );
          SET @systemUserId = SCOPE_IDENTITY();
        END

        UPDATE dbo.BaoHong SET NguoiBaoID = @systemUserId WHERE NguoiBaoID = @userId;
        UPDATE dbo.BaoHong SET KyThuatVienNhanID = @systemUserId WHERE KyThuatVienNhanID = @userId;
        UPDATE dbo.LogBaoTri SET KyThuatVienID = @systemUserId WHERE KyThuatVienID = @userId;
        UPDATE dbo.PhanQuyenNguoiDung SET CapQuyenBoi = NULL WHERE CapQuyenBoi = @userId;
        DELETE FROM dbo.PhanQuyenNguoiDung WHERE NguoiDungID = @userId;
        DELETE FROM dbo.NguoiDung
        WHERE NguoiDungID = @userId AND TenDangNhap <> N'system_deleted_account';
        SELECT @@ROWCOUNT AS deletedCount;
      `);

      await transaction.commit();
      return Number(result.recordset?.[0]?.deletedCount || 0) === 1;
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }
  }
}

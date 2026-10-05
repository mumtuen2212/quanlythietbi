import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { POSTGRES_SCHEMA } from './postgresSchema';
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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Set it to the Neon PostgreSQL connection string in the Render environment.');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  keepAlive: true
});

pool.on('error', error => {
  console.error('Unexpected idle PostgreSQL client error:', error);
});

let schemaReady: Promise<void> | null = null;

function initializeSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(POSTGRES_SCHEMA)
      .then(() => {
        return pool.query(`
          INSERT INTO "VaiTro" ("MaVaiTro", "TenVaiTro", "CapDo", "MoTa") VALUES
            ('ADMIN', 'Quản trị hệ thống', 1, 'Quản trị toàn hệ thống'),
            ('TECHNICIAN', 'Kỹ thuật viên', 2, 'Quản lý và bảo trì thiết bị'),
            ('TEACHER', 'Giảng viên', 3, 'Tra cứu và báo hỏng thiết bị'),
            ('STUDENT', 'Sinh viên', 4, 'Tra cứu và báo hỏng thiết bị')
          ON CONFLICT ("MaVaiTro") DO NOTHING;
          INSERT INTO "LoaiThietBi" ("MaLoai", "TenLoai", "MoTa") VALUES
            ('MIC', 'Micro', 'Thiết bị micro'),
            ('PROJECTOR', 'Máy chiếu', 'Thiết bị trình chiếu'),
            ('AMPLIFIER', 'Âm ly', 'Thiết bị khuếch đại âm thanh'),
            ('AC', 'Điều hòa', 'Thiết bị điều hòa không khí')
          ON CONFLICT ("MaLoai") DO NOTHING;
        `);
      })
      .then(() => {
        console.log('✅ Neon PostgreSQL connected; schema is ready');
      })
      .catch(error => {
        schemaReady = null;
        console.error('❌ PostgreSQL initialization failed:', error.message);
        throw error;
      });
  }
  return schemaReady;
}

const tableNames = [
  'DiemNoiBat', 'ToaNha', 'PhongHoc', 'LoaiThietBi', 'ThietBi',
  'HuongDanSuDung', 'BaoHong', 'LogBaoTri', 'VaiTro', 'Quyen',
  'PhanQuyenVaiTro', 'PhanQuyenNguoiDung', 'NguoiDung'
];
const columnNames = [
  'DiemNoiBatID', 'MaDiem', 'TenDiem', 'LoaiDiem', 'MoTa', 'X', 'Y', 'Latitude', 'Longitude', 'NgayTao',
  'ToaNhaID', 'MaToaNha', 'TenToaNha', 'ChieuRong', 'ChieuCao', 'SoTang', 'MauSac', 'XiengVaoX', 'XiengVaoY',
  'PhongHocID', 'SoPhong', 'TenPhong', 'Tang', 'MaQR', 'TrangThai', 'LoaiPhong', 'CuaX', 'CuaY',
  'LoaiThietBiID', 'MaLoai', 'TenLoai', 'ThietBiID', 'MaThietBi', 'TenThietBi', 'Model', 'SerialNumber', 'ViTri',
  'NgayCapNhat', 'HuongDanID', 'TieuDe', 'NoiDung', 'BaoHongID', 'NguoiBaoID', 'KyThuatVienNhanID',
  'AnhURL', 'MucDo', 'LogBaoTriID', 'KyThuatVienID', 'HanhDong', 'VaiTroID', 'MaVaiTro', 'TenVaiTro',
  'CapDo', 'QuyenID', 'MaQuyen', 'TenQuyen', 'PhanQuyenVaiTroID', 'PhanQuyenNguoiDungID', 'NguoiDungID',
  'CapQuyenBoi', 'TenDangNhap', 'MatKhauHash', 'HoTen', 'Email', 'SoDienThoai'
];

function translateLegacyQuery(text: string, params: Record<string, unknown>) {
  const values: unknown[] = [];
  const placeholders = new Map<string, string>();
  let returningClause = '';
  let source = text
    .replace(/\bN(?=')/g, '')
    .replace(/\bGETDATE\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bCONVERT\(varchar\(10\),\s*DATEADD\(year,\s*(\d+),\s*([\w.]+)\),\s*120\)/gi, "to_char(($2 + INTERVAL '$1 years'), 'YYYY-MM-DD')")
    .replace(/\bCONVERT\(varchar\(19\),\s*([\w.]+),\s*120\)/gi, "to_char($1, 'YYYY-MM-DD HH24:MI:SS')")
    .replace(/\bCONVERT\(varchar\(10\),\s*([\w.]+),\s*120\)/gi, "to_char($1, 'YYYY-MM-DD')")
    .replace(/\bCONVERT\(varchar\(8\),\s*([\w.]+),\s*112\)/gi, "to_char($1, 'YYYYMMDD')")
    .replace(/\bCAST\(0\s+AS\s+bit\)/gi, 'FALSE')
    .replace(/\bOUTPUT\s+INSERTED\.(\w+)\s+AS\s+(\w+)/gi, (_match, column: string, alias: string) => {
      returningClause = ` RETURNING "${column}" AS "${alias}"`;
      return '';
    })
    .replace(/\bSELECT\s+TOP\s+(\d+)\s+/gi, 'SELECT ')
    .replace(/\('INC-'\s*\+\s*to_char\(b\.NgayTao,\s*'YYYYMMDD'\)\s*\+\s*'-'\s*\+\s*RIGHT\('000'\s*\+\s*CAST\(b\.BaoHongID\s+AS\s+varchar\),\s*3\)\)/gi, "('INC-' || to_char(b.NgayTao, 'YYYYMMDD') || '-' || lpad(b.BaoHongID::text, 3, '0'))");

  let translated = '';
  let inString = false;
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === "'") {
      translated += char;
      if (inString && source[index + 1] === "'") {
        translated += "'";
        index += 2;
        continue;
      }
      inString = !inString;
      index++;
      continue;
    }
    if (inString) {
      translated += char;
      index++;
      continue;
    }

    const parameter = source.slice(index).match(/^@([A-Za-z_]\w*)/);
    if (parameter) {
      const name = parameter[1];
      if (!Object.prototype.hasOwnProperty.call(params, name)) {
        throw new Error(`Missing SQL parameter: @${name}`);
      }
      let placeholder = placeholders.get(name);
      if (!placeholder) {
        values.push(params[name]);
        placeholder = `$${values.length}`;
        placeholders.set(name, placeholder);
      }
      translated += placeholder;
      index += parameter[0].length;
      continue;
    }

    const word = source.slice(index).match(/^[A-Za-z_]\w*/);
    if (word) {
      const name = word[0];
      if (name.toLowerCase() === 'dbo' && source.slice(index + name.length).match(/^\s*\./)) {
        const afterDot = index + name.length + source.slice(index + name.length).match(/^\s*\./)![0].length;
        const table = source.slice(afterDot).match(/^([A-Za-z_]\w*)/);
        if (!table || !tableNames.includes(table[1])) {
          throw new Error(`Unknown database table after dbo: ${table?.[1] || ''}`);
        }
        translated += `"${table[1]}"`;
        index = afterDot + table[1].length;
        continue;
      }
      if (/[A-Z]/.test(name) && /\bAS\s+$/.test(translated)) {
        translated += `"${name}"`;
      } else if (columnNames.includes(name)) {
        translated += `"${name}"`;
      } else {
        translated += name;
      }
      index += name.length;
      continue;
    }
    translated += char;
    index++;
  }
  return { text: `${translated.trim()}${returningClause}`, values };
}

function splitStatements(text: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    if (text[index] === "'" && !(inString && text[index + 1] === "'")) inString = !inString;
    else if (text[index] === "'" && inString && text[index + 1] === "'") index++;
    else if (text[index] === ';' && !inString) {
      const statement = text.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) statements.push(tail);
  return statements;
}

export class PostgresDatabase {

  /**
   * Run a PostgreSQL transaction against Neon.
   */
  static async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    await initializeSchema();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  static async connect(): Promise<Pool> {
    await initializeSchema();
    return pool;
  }

  static async query<T = any>(text: string, params: Record<string, any> = {}): Promise<T[]> {
    await initializeSchema();
    const client = await pool.connect();
    try {
      let rows: T[] = [];
      for (const statement of splitStatements(text)) {
        const query = translateLegacyQuery(statement, params);
        const result = await client.query(query.text, query.values);
        rows = result.rows as T[];
      }
      return rows;
    } finally {
      client.release();
    }
  }

  static async one<T = any>(text: string, params: Record<string, any> = {}): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows.length ? rows[0] : null;
  }

  // ================= DASHBOARD STATS =================
  static async getDashboardStats() {
    const row = await PostgresDatabase.one<any>(`
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
    const rows = await PostgresDatabase.query<any>(`
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
    const rows = await PostgresDatabase.query<any>(`
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
    return PostgresDatabase.one<Building>(`
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
    const result = await PostgresDatabase.query<any>(`
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

    return (await PostgresDatabase.getBuildingById(result[0].id)) as Building;
  }

  static async updateBuilding(id: number, payload: Partial<Building>): Promise<Building | null> {
    await PostgresDatabase.query(`
      UPDATE dbo.ToaNha SET
        MaToaNha = COALESCE(@building_code, MaToaNha), TenToaNha = COALESCE(@name, TenToaNha),
        MoTa = COALESCE(@description, MoTa), SoTang = COALESCE(@floors, SoTang), MauSac = COALESCE(@color, MauSac),
        Latitude = COALESCE(@latitude, Latitude), Longitude = COALESCE(@longitude, Longitude)
      WHERE ToaNhaID = @id
    `, { id, building_code: payload.building_code ?? null, name: payload.name ?? null, description: payload.description ?? null, floors: payload.floors ?? null, color: payload.color ?? null, latitude: payload.latitude ?? null, longitude: payload.longitude ?? null });
    return PostgresDatabase.getBuildingById(id);
  }

  static async deleteBuilding(id: number): Promise<boolean> {
    return PostgresDatabase.transaction(async client => {
      const params = { id };
      const queries = [`
        UPDATE dbo.ThietBi SET PhongHocID = NULL WHERE PhongHocID IN (SELECT PhongHocID FROM dbo.PhongHoc WHERE ToaNhaID = @id)
      `, `
        UPDATE dbo.BaoHong SET PhongHocID = NULL WHERE PhongHocID IN (SELECT PhongHocID FROM dbo.PhongHoc WHERE ToaNhaID = @id)
      `, `
        DELETE FROM dbo.PhongHoc WHERE ToaNhaID = @id
      `, `
        DELETE FROM dbo.ToaNha WHERE ToaNhaID = @id RETURNING ToaNhaID
      `];
      let result: { rowCount: number | null } = { rowCount: 0 };
      for (const text of queries) {
        const query = translateLegacyQuery(text, params);
        result = await client.query(query.text, query.values);
      }
      return result.rowCount === 1;
    });
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
    return PostgresDatabase.query<Room>(query, params);
  }

  static async getRoomById(id: number): Promise<(Room & { devices: Device[]; pendingReportsCount: number }) | null> {
    const room = await PostgresDatabase.one<any>(`
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

    const devices = await PostgresDatabase.getDevicesByRoomId(id);
    return { ...room, devices, pendingReportsCount: room.pendingReportsCount || 0 };
  }

  static async getRoomByQr(qrCode: string): Promise<Room | null> {
    return PostgresDatabase.one<Room>(`
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

    const res = await PostgresDatabase.query<any>(`
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
    return (await PostgresDatabase.getRoomById(newId)) as Room;
  }

  static async updateRoom(id: number, payload: Partial<Room>): Promise<Room | null> {
    const existing = await PostgresDatabase.getRoomById(id);
    if (!existing) return null;

    await PostgresDatabase.query(`
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

    return PostgresDatabase.getRoomById(id);
  }

  static async deleteRoom(id: number): Promise<boolean> {
    // A room is referenced by both equipment and incident reports.  Keep these
    // updates and the delete in one transaction so a failed delete cannot leave
    // the database in a partially updated state.
    return PostgresDatabase.transaction(async client => {
      const params = { id };
      for (const text of [
        'UPDATE dbo.ThietBi SET PhongHocID = NULL WHERE PhongHocID = @id',
        'UPDATE dbo.BaoHong SET PhongHocID = NULL WHERE PhongHocID = @id'
      ]) {
        const translated = translateLegacyQuery(text, params);
        await client.query(translated.text, translated.values);
      }
      const query = translateLegacyQuery('DELETE FROM dbo.PhongHoc WHERE PhongHocID = @id', params);
      const result = await client.query(query.text, query.values);
      return result.rowCount === 1;
    });
  }

  // ================= CATEGORIES =================
  static async getCategories(): Promise<DeviceCategory[]> {
    const rows = await PostgresDatabase.query<any>(`
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
    return PostgresDatabase.query<Device>(query, params);
  }

  static async getDevicesByRoomId(roomId: number): Promise<Device[]> {
    return PostgresDatabase.query<Device>(`
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
    const dev = await PostgresDatabase.one<any>(`
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

    const manual = await PostgresDatabase.getManualByDeviceId(id);
    const history = await PostgresDatabase.getMaintenanceLogsByDeviceId(id);

    return { ...dev, manual: manual || null, history };
  }

  static async getDeviceByQr(qrCode: string): Promise<Device | null> {
    return PostgresDatabase.one<Device>(`
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

    const res = await PostgresDatabase.query<any>(`
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
    return (await PostgresDatabase.getDeviceById(newId)) as Device;
  }

  static async updateDevice(id: number, payload: Partial<Device>): Promise<Device | null> {
    await PostgresDatabase.query(`
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

    return PostgresDatabase.getDeviceById(id);
  }

  static async updateDeviceStatus(id: number, status: Device['status']): Promise<Device | null> {
    await PostgresDatabase.query(`
      UPDATE dbo.ThietBi SET TrangThai = @status WHERE ThietBiID = @id
    `, { id, status });
    return PostgresDatabase.getDeviceById(id);
  }

  static async deleteDevice(id: number): Promise<boolean> {
    return PostgresDatabase.transaction(async client => {
      const params = { id };
      for (const text of [
        'DELETE FROM dbo.HuongDanSuDung WHERE ThietBiID = @id',
        'DELETE FROM dbo.LogBaoTri WHERE BaoHongID IN (SELECT BaoHongID FROM dbo.BaoHong WHERE ThietBiID = @id)',
        'UPDATE dbo.BaoHong SET ThietBiID = NULL WHERE ThietBiID = @id'
      ]) {
        const translated = translateLegacyQuery(text, params);
        await client.query(translated.text, translated.values);
      }
      const query = translateLegacyQuery('DELETE FROM dbo.ThietBi WHERE ThietBiID = @id', params);
      const result = await client.query(query.text, query.values);
      return result.rowCount === 1;
    });
  }

  // ================= MANUALS =================
  static async getManuals(): Promise<Manual[]> {
    const rows = await PostgresDatabase.query<any>(`
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
    const row = await PostgresDatabase.one<any>(`
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
    const row = await PostgresDatabase.one<any>(`
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
  static async getIncidentReports(status?: string, roomId?: number, reporterId?: number): Promise<IncidentReport[]> {
    let query = `
      SELECT
        b.BaoHongID AS id,
        ('INC-' || to_char(b.NgayTao, 'YYYYMMDD') || '-' || lpad(CAST(b.BaoHongID AS varchar), 3, '0')) AS report_code,
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
    if (reporterId) {
      query += ` AND b.NguoiBaoID = @reporterId`;
      params.reporterId = reporterId;
    }

    query += ` ORDER BY b.BaoHongID DESC`;
    const rows = await PostgresDatabase.query<any>(query, params);

    return rows.map(r => ({
      ...r,
      image_urls: r.image_url ? [r.image_url] : []
    }));
  }

  static async getIncidentReportById(id: number): Promise<IncidentReport | null> {
    const row = await PostgresDatabase.one<any>(`
      SELECT
        b.BaoHongID AS id,
        ('INC-' || to_char(b.NgayTao, 'YYYYMMDD') || '-' || lpad(CAST(b.BaoHongID AS varchar), 3, '0')) AS report_code,
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

    const res = await PostgresDatabase.query<any>(`
      INSERT INTO dbo.BaoHong (
        NguoiBaoID, PhongHocID, ThietBiID, TieuDe, MoTa, AnhURL, MucDo, TrangThai, NgayTao, NgayCapNhat
      )
      OUTPUT INSERTED.BaoHongID AS id
      VALUES (
        @reporter_id, @room_id, @device_id, @title, @description, @image_url, @priority, N'PENDING', GETDATE(), GETDATE()
      )
    `, {
      reporter_id: payload.reporter_id || null,
      room_id: payload.room_id,
      device_id: payload.device_id || null,
      title: payload.title,
      description: payload.description,
      image_url: firstImg,
      priority: payload.priority || 'MEDIUM'
    });

    const newId = res[0]?.id;

    if (payload.device_id) {
      await PostgresDatabase.updateDeviceStatus(payload.device_id, 'DAMAGED');
    }

    return (await PostgresDatabase.getIncidentReportById(newId)) as IncidentReport;
  }

  static async updateIncidentStatus(
    id: number,
    status: IncidentReport['status'],
    technicianId?: number,
    technicianName?: string,
    solutionNote?: string
  ): Promise<IncidentReport | null> {
    await PostgresDatabase.query(`
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
      await PostgresDatabase.query(`
        INSERT INTO dbo.LogBaoTri (BaoHongID, KyThuatVienID, HanhDong, NgayTao)
        VALUES (@id, @technicianId, @action, GETDATE())
      `, {
        id,
        technicianId: technicianId || 2,
        action: solutionNote
      });
    }

    const report = await PostgresDatabase.getIncidentReportById(id);
    if (status === 'RESOLVED' && report?.device_id) {
      await PostgresDatabase.updateDeviceStatus(report.device_id, 'ACTIVE');
    }

    return report;
  }

  // ================= MAINTENANCE LOGS =================
  static async getMaintenanceLogs(): Promise<MaintenanceLog[]> {
    const rows = await PostgresDatabase.query<any>(`
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
    const rows = await PostgresDatabase.query<any>(`
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
    const res = await PostgresDatabase.query<any>(`
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
    const rows = await PostgresDatabase.query<any>(`
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
    const row = await PostgresDatabase.one<any>(`
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
    const row = await PostgresDatabase.one<any>(`
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
    const row = await PostgresDatabase.one<any>(`
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
    const roleRow = await PostgresDatabase.one<any>(`
      SELECT VaiTroID FROM dbo.VaiTro WHERE MaVaiTro = @role
    `, { role });
    const vaiTroId = roleRow ? roleRow.VaiTroID : 5;

    const result = await PostgresDatabase.query<any>(`
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
    return id ? PostgresDatabase.getUserById(id) : null;
  }

  static async updateUserRole(userId: number, roleName: RoleName): Promise<User | null> {
    const roleRow = await PostgresDatabase.one<any>(`
      SELECT VaiTroID FROM dbo.VaiTro WHERE MaVaiTro = @roleName
    `, { roleName });
    if (!roleRow) return null;

    await PostgresDatabase.query(`
      UPDATE dbo.NguoiDung
      SET VaiTroID = @vaiTroId, NgayCapNhat = GETDATE()
      WHERE NguoiDungID = @userId
    `, { userId, vaiTroId: roleRow.VaiTroID });

    return PostgresDatabase.getUserById(userId);
  }

  static async updateOwnPassword(userId: number, passwordHash: string): Promise<boolean> {
    const rows = await PostgresDatabase.query<any>(`
      UPDATE dbo.NguoiDung SET MatKhauHash = @passwordHash, NgayCapNhat = GETDATE()
      WHERE NguoiDungID = @userId
      RETURNING NguoiDungID AS changed
    `, { userId, passwordHash });
    return rows.length === 1;
  }

  static async deleteUser(userId: number): Promise<boolean> {
    const systemPasswordHash = await bcrypt.hash(`system-deleted-account:${Date.now()}`, 12);
    return PostgresDatabase.transaction(async client => {
      const existing = await client.query(
        `SELECT "NguoiDungID" FROM "NguoiDung" WHERE "TenDangNhap" = $1`,
        ['system_deleted_account']
      );
      let systemUserId = existing.rows[0]?.NguoiDungID;
      if (!systemUserId) {
        const role = await client.query(`SELECT "VaiTroID" FROM "VaiTro" WHERE "MaVaiTro" = $1`, ['STUDENT']);
        const inserted = await client.query(`
          INSERT INTO "NguoiDung" (
            "TenDangNhap", "MatKhauHash", "HoTen", "Email", "SoDienThoai", "VaiTroID", "TrangThai"
          ) VALUES ($1, $2, $3, $4, '', $5, 'HOAT_DONG')
          RETURNING "NguoiDungID"
        `, ['system_deleted_account', systemPasswordHash, 'Tài khoản đã xóa', 'system-deleted-account@local.invalid', role.rows[0]?.VaiTroID || null]);
        systemUserId = inserted.rows[0].NguoiDungID;
      }
      for (const [table, column] of [
        ['BaoHong', 'NguoiBaoID'],
        ['BaoHong', 'KyThuatVienNhanID'],
        ['LogBaoTri', 'KyThuatVienID']
      ]) {
        await client.query(`UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`, [systemUserId, userId]);
      }
      await client.query(`UPDATE "PhanQuyenNguoiDung" SET "CapQuyenBoi" = NULL WHERE "CapQuyenBoi" = $1`, [userId]);
      await client.query(`DELETE FROM "PhanQuyenNguoiDung" WHERE "NguoiDungID" = $1`, [userId]);
      const deleted = await client.query(`
        DELETE FROM "NguoiDung"
        WHERE "NguoiDungID" = $1 AND "TenDangNhap" <> 'system_deleted_account'
      `, [userId]);
      return deleted.rowCount === 1;
    });
  }
}

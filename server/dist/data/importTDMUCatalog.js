"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-time SQL import for the TDMU campus catalogue supplied by the project owner.
 * It replaces only the sample campus catalogue and records all map positions in SQL.
 */
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123456',
    server: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 1434),
    database: process.env.DB_NAME || 'quanlythietbi',
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};
const buildings = [
    ['A1', 'Tòa nhà A1', 2, 10.98112, 106.67417, '#2563eb'], ['A2', 'Tòa nhà A2', 3, 10.98071, 106.67409, '#2563eb'],
    ['A3', 'Dãy A3', 1, 10.98047, 106.67376, '#2563eb'], ['A4', 'Dãy A4', 1, 10.98009, 106.67355, '#2563eb'],
    ['B1', 'Tòa nhà B', 5, 10.98070, 106.67475, '#0ea5e9'], ['C', 'Dãy phòng C', 2, 10.98026, 106.67418, '#0284c7'],
    ['D', 'Dãy phòng D', 1, 10.98003, 106.67419, '#2563eb'], ['E1', 'Tòa nhà E1', 4, 10.98051, 106.67506, '#2563eb'],
    ['E2', 'Dãy phòng E2', 1, 10.98055, 106.67480, '#2563eb'], ['E3', 'Dãy phòng E3', 1, 10.98009, 106.67457, '#2563eb'],
    ['F1', 'Dãy phòng F1', 1, 10.98042, 106.67487, '#16a34a'], ['F2', 'Dãy phòng F2', 1, 10.98015, 106.67489, '#16a34a'],
    ['F3', 'Dãy phòng F3', 1, 10.97998, 106.67480, '#16a34a'], ['G', 'Dãy G', 1, 10.97983, 106.67430, '#2563eb'],
    ['H1', 'Tòa nhà H1', 3, 10.97960, 106.67487, '#2563eb'], ['H2', 'Dãy nhà H2', 1, 10.97946, 106.67510, '#2563eb'],
    ['HT1', 'Hội trường', 2, 10.98003, 106.67397, '#9333ea'], ['I1', 'Tòa nhà I1', 4, 10.97905, 106.67444, '#3815e8'],
    ['I2', 'Tòa nhà I2', 4, 10.97894, 106.67475, '#3815e8'], ['I3', 'Tòa nhà I3', 3, 10.97929, 106.67425, '#3815e8'],
    ['I4', 'Tòa nhà I4', 4, 10.97948, 106.67378, '#3815e8'], ['KTH-I4', 'Khu tự học I4', 1, 10.97910, 106.67355, '#3815e8'],
    ['K', 'Dãy phòng K', 2, 10.97892, 106.67512, '#2563eb'], ['K23', 'Tòa nhà K23', 2, 10.97875, 106.67495, '#2563eb']
].map(([code, name, floors, latitude, longitude, color]) => ({ code, name, floors, latitude, longitude, color }));
const rooms = [];
const add = (building, code, name, floor) => rooms.push({ building, code, name, floor });
const addRange = (building, prefix, start, end, floor, name = 'Phòng học') => {
    for (let n = start; n <= end; n++)
        add(building, `${prefix}-${n}`, `${name} ${prefix}-${n}`, floor);
};
add('A1', 'A1-101', 'Giảng đường A1-101', 1);
add('A1', 'A1-102', 'Giảng đường A1-102', 1);
[['BCSVC', 'Ban cơ sở vật chất'], ['BKHCN&HTQT', 'Ban khoa học công nghệ và hợp tác quốc tế'], ['BTXNS', 'Ban tổ chức nhân sự'], ['PCPVBCC', 'Phòng cấp phát văn bằng chứng chỉ'], ['PK1', 'Phòng khách 1'], ['PTT', 'Phòng truyền thông'], ['VP', 'Văn phòng']].forEach(([code, name]) => add('A1', code, name, 1));
add('A1', 'BTC', 'Ban tài chính', 2);
addRange('A2', 'A2', 101, 114, 1);
[['A2-201', 'Thư viện', 2], ['A2-203', 'Thư viện', 2], ['A2-204', 'Thư viện', 2], ['A2-302', 'Thư viện', 3]].forEach(([c, n, f]) => add('A2', c, n, f));
addRange('A3', 'A3', 101, 104, 1);
addRange('A4', 'A4', 101, 111, 1);
add('B1', 'KTH-B', 'Khu tự học', 1);
[['GB', 'Phòng họp giao ban', 2], ['PHT', 'Phòng Hiệu trưởng', 2], ['PPHT', 'Phòng các phó hiệu trưởng', 2], ['B1-301', 'Viện Công nghệ số', 3], ['CNS', 'Viện công nghệ số', 3], ['KTCN', 'Viện Kỹ thuật Công nghệ', 3], ['KTTC', 'Trường kinh tế tài chính', 4], ['L&QL', 'Trường luật và quản lý phát triển', 4], ['SXCT', 'Phòng sản xuất chương trình', 5]].forEach(([c, n, f]) => add('B1', c, n, f));
addRange('C', 'C', 101, 104, 1, 'Phòng máy');
addRange('C', 'C', 201, 204, 2, 'Phòng máy');
addRange('D', 'D', 101, 106, 1);
[['PH3', 'Phòng Họp 3', 1], ['PH4', 'Phòng Họp 4', 1], ['TTNN', 'Trung Tâm Ngoại Ngữ', 1], ['TTĐTQT', 'TT Đào Tạo Quốc Tế', 1]].forEach(([c, n, f]) => add('E1', c, n, f));
addRange('E1', 'E1', 201, 210, 2);
addRange('E1', 'E1', 301, 310, 3);
addRange('E1', 'E1', 401, 410, 4);
addRange('E2', 'E2', 101, 104, 1);
addRange('E3', 'E3', 101, 104, 1);
[['BCSNG', 'Ban chăm sóc người học', 1], ['KCNVH', 'Khoa công nghiệp văn hóa', 1], ['VPD-H-T', 'Đoàn thanh niên và hội sinh viên', 1], ['VĐTSĐH', 'Viện Đào Tạo Sau Đại Học', 1]].forEach(([c, n, f]) => add('F1', c, n, f));
addRange('F2', 'F2', 101, 104, 1);
[['F3-101', 'Phòng học F3-101'], ['F3-102', 'Dãy phòng F2-102'], ['F3-103', 'Dãy phòng F3-103']].forEach(([c, n]) => add('F3', c, n, 1));
[['CHTD', 'Cửa hàng đồ thể dục'], ['CHĐTD', 'Cửa Hàng Đồ Thể Dục'], ['TTYT', 'Trạm Y Tế'], ['TTĐBCL', 'Trung Tâm Đảm Bảo Chất Lượng'], ['TVTL', 'Phòng Tham Vấn Tâm Lý']].forEach(([c, n]) => add('G', c, n, 1));
addRange('H1', 'H1', 101, 103, 1);
addRange('H1', 'H1', 201, 204, 2);
addRange('H1', 'H1', 301, 304, 3);
[['CNXBV', 'Viện Công Nghệ Xanh Bền Vững'], ['TTCDS', 'Trung Tâm Chuyển Đổi Số'], ['ĐTKTXDGT', 'Viện Đào Tạo Kiến Trúc Xây Dựng Giao Thông']].forEach(([c, n]) => add('H2', c, n, 1));
add('HT1', 'HT2', 'Hội Trường 2', 2);
add('HT1', 'HT1', 'Hội Trường 1', 1);
for (let floor = 1; floor <= 4; floor++)
    addRange('I1', 'I1', floor * 100 + 1, floor * 100 + 5, floor);
add('I2', 'I2-101', 'Khoa kiến thức chung', 1);
add('I2', 'I2-102', 'Khoa kinh tế', 1);
addRange('I2', 'I2', 103, 104, 1);
for (let floor = 2; floor <= 4; floor++)
    addRange('I2', 'I2', floor * 100 + 1, floor * 100 + 5, floor);
addRange('I3', 'I3', 101, 106, 1);
addRange('I3', 'I3', 201, 206, 2);
[301, 302, 303, 304, 306].forEach(n => add('I3', `I3-${n}`, `Phòng học I3-${n}`, 3));
add('I3', 'I3-305', 'Phòng Học I3-305', 1);
addRange('I4', 'I4', 107, 113, 1);
addRange('I4', 'I4', 207, 214, 2);
addRange('I4', 'I4', 307, 314, 3);
addRange('I4', 'I4', 401, 402, 4);
add('KTH-I4', 'KTH-I4', 'Khu tự học I4', 1);
addRange('K', 'K', 101, 106, 1);
add('K', 'K-201', 'Phòng học', 2);
add('K', 'TTHTDN&KN', 'Trung Tâm Hợp Tác Doanh Nghiệp và Khởi Nghiệp', 2);
addRange('K23', 'K23', 101, 102, 1);
addRange('K23', 'K23', 201, 203, 2);
const specialPoints = [
    ['GATE-1', 'Cổng 1', 'GATE', 10.9810274, 106.6754800], ['GATE-2', 'Cổng 2', 'GATE', 10.9803432, 106.6755800], ['GATE-3', 'Cổng 3', 'GATE', 10.9799853, 106.6755800], ['GATE-4', 'Cổng 4', 'GATE', 10.9792169, 106.6755800], ['GATE-5', 'Cổng 5', 'GATE', 10.9822905, 106.6735400], ['PARKING-NORTH', 'Bãi Xe', 'PARKING', 10.9815747, 106.6736700], ['PARKING-SOUTH', 'Bãi Xe', 'PARKING', 10.9791060, 106.6750200], ['GS25-NORTH', 'GS 25', 'ADMIN', 10.9813530, 106.6747600], ['GS25-SOUTH', 'GS 25', 'ADMIN', 10.9792530, 106.6748300]
];
async function run() {
    if (rooms.length !== 237)
        throw new Error(`Danh mục phải có 237 phòng, hiện có ${rooms.length}.`);
    const pool = await mssql_1.default.connect(config);
    const transaction = new mssql_1.default.Transaction(pool);
    await transaction.begin();
    try {
        const request = new mssql_1.default.Request(transaction);
        await request.query(`
      IF COL_LENGTH('dbo.ToaNha', 'Latitude') IS NULL ALTER TABLE dbo.ToaNha ADD Latitude DECIMAL(10,7) NULL;
      IF COL_LENGTH('dbo.ToaNha', 'Longitude') IS NULL ALTER TABLE dbo.ToaNha ADD Longitude DECIMAL(10,7) NULL;
      IF COL_LENGTH('dbo.PhongHoc', 'Latitude') IS NULL ALTER TABLE dbo.PhongHoc ADD Latitude DECIMAL(10,7) NULL;
      IF COL_LENGTH('dbo.PhongHoc', 'Longitude') IS NULL ALTER TABLE dbo.PhongHoc ADD Longitude DECIMAL(10,7) NULL;
      IF COL_LENGTH('dbo.DiemNoiBat', 'Latitude') IS NULL ALTER TABLE dbo.DiemNoiBat ADD Latitude DECIMAL(10,7) NULL;
      IF COL_LENGTH('dbo.DiemNoiBat', 'Longitude') IS NULL ALTER TABLE dbo.DiemNoiBat ADD Longitude DECIMAL(10,7) NULL;
      DELETE FROM dbo.LogBaoTri; DELETE FROM dbo.BaoHong; DELETE FROM dbo.HuongDanSuDung;
      DELETE FROM dbo.ThietBi; DELETE FROM dbo.PhongHoc; DELETE FROM dbo.ToaNha; DELETE FROM dbo.DiemNoiBat;
    `);
        for (const table of ['PhongHoc', 'ToaNha', 'DiemNoiBat'])
            await request.query(`DBCC CHECKIDENT ('dbo.${table}', RESEED, 0)`);
        const buildingIds = new Map();
        for (const building of buildings) {
            const result = await new mssql_1.default.Request(transaction).input('code', mssql_1.default.NVarChar, building.code).input('name', mssql_1.default.NVarChar, building.name).input('floors', mssql_1.default.Int, building.floors).input('latitude', mssql_1.default.Decimal(10, 7), building.latitude).input('longitude', mssql_1.default.Decimal(10, 7), building.longitude).input('color', mssql_1.default.NVarChar, building.color).query(`INSERT dbo.ToaNha (MaToaNha,TenToaNha,MoTa,X,Y,ChieuRong,ChieuCao,SoTang,MauSac,XiengVaoX,XiengVaoY,Latitude,Longitude,NgayTao) OUTPUT INSERTED.ToaNhaID AS id VALUES (@code,@name,N'Danh mục khuôn viên TDMU',500,350,200,140,@floors,@color,500,350,@latitude,@longitude,GETDATE())`);
            buildingIds.set(building.code, result.recordset[0].id);
        }
        const indices = new Map();
        for (const room of rooms) {
            const building = buildings.find(item => item.code === room.building);
            const indexKey = `${room.building}-${room.floor}`;
            const index = indices.get(indexKey) || 0;
            indices.set(indexKey, index + 1);
            const latitude = building.latitude + ((index % 5) - 2) * 0.000018 + (room.floor - 1) * 0.000003;
            const longitude = building.longitude + (Math.floor(index / 5) - 1) * 0.000020;
            await new mssql_1.default.Request(transaction).input('buildingId', mssql_1.default.Int, buildingIds.get(room.building)).input('code', mssql_1.default.NVarChar, room.code).input('name', mssql_1.default.NVarChar, room.name).input('floor', mssql_1.default.Int, room.floor).input('latitude', mssql_1.default.Decimal(10, 7), latitude).input('longitude', mssql_1.default.Decimal(10, 7), longitude).query(`INSERT dbo.PhongHoc (ToaNhaID,SoPhong,TenPhong,Tang,MaQR,TrangThai,MoTa,LoaiPhong,X,Y,ChieuRong,ChieuCao,CuaX,CuaY,Latitude,Longitude,NgayTao) VALUES (@buildingId,@code,@name,@floor,CONCAT(N'QR-ROOM-',@code),N'ACTIVE',N'Danh mục phòng TDMU',N'CLASSROOM',0,0,180,120,50,50,@latitude,@longitude,GETDATE())`);
        }
        for (const [code, name, category, latitude, longitude] of specialPoints)
            await new mssql_1.default.Request(transaction).input('code', mssql_1.default.NVarChar, code).input('name', mssql_1.default.NVarChar, name).input('category', mssql_1.default.NVarChar, category).input('latitude', mssql_1.default.Decimal(10, 7), latitude).input('longitude', mssql_1.default.Decimal(10, 7), longitude).query(`INSERT dbo.DiemNoiBat (MaDiem,TenDiem,LoaiDiem,MoTa,X,Y,Latitude,Longitude,NgayTao) VALUES (@code,@name,@category,N'Điểm đặc biệt khuôn viên',0,0,@latitude,@longitude,GETDATE())`);
        await transaction.commit();
        console.log(`Đã đồng bộ ${buildings.length} tòa/dãy, ${rooms.length} phòng và ${specialPoints.length} điểm đặc biệt vào SQL.`);
    }
    catch (error) {
        await transaction.rollback().catch(() => undefined);
        throw error;
    }
    finally {
        await pool.close();
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARED_MANUAL_SCHEMA_SQL = void 0;
exports.consolidateSharedManuals = consolidateSharedManuals;
const mssql_1 = __importDefault(require("mssql"));
// Old databases tied every manual to one device. A shared manual instead belongs
// to a category, optionally restricted to a model with different controls.
exports.SHARED_MANUAL_SCHEMA_SQL = `
  IF COL_LENGTH('dbo.HuongDanSuDung', 'LoaiThietBiID') IS NULL
    ALTER TABLE dbo.HuongDanSuDung ADD LoaiThietBiID int NULL;
  IF COL_LENGTH('dbo.HuongDanSuDung', 'ModelApDung') IS NULL
    ALTER TABLE dbo.HuongDanSuDung ADD ModelApDung nvarchar(120) NULL;
  IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.HuongDanSuDung') AND name = 'ThietBiID' AND is_nullable = 0
  ) ALTER TABLE dbo.HuongDanSuDung ALTER COLUMN ThietBiID int NULL;
`;
async function consolidateSharedManuals(pool) {
    await pool.request().query(exports.SHARED_MANUAL_SCHEMA_SQL);
    const transaction = new mssql_1.default.Transaction(pool);
    await transaction.begin(mssql_1.default.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const result = await new mssql_1.default.Request(transaction).query(`
      SET XACT_ABORT ON;
      DECLARE @Before int = (SELECT COUNT(*) FROM dbo.HuongDanSuDung);

      IF OBJECT_ID('dbo.HuongDanSuDung_TruocGop', 'U') IS NULL
        CREATE TABLE dbo.HuongDanSuDung_TruocGop (
          HuongDanID int NOT NULL PRIMARY KEY, ThietBiID int NULL,
          TieuDe nvarchar(200) NOT NULL, NoiDung nvarchar(max) NOT NULL,
          NgayTao datetime NOT NULL, LoaiThietBiID int NULL,
          ModelApDung nvarchar(120) NULL, NgaySaoLuu datetime NOT NULL DEFAULT GETDATE()
        );

      SELECT h.HuongDanID, d.LoaiThietBiID,
        ISNULL(NULLIF(LTRIM(RTRIM(d.Model)), N''), N'') AS ModelApDung,
        HASHBYTES('SHA2_256', CONVERT(varbinary(max), h.NoiDung)) AS ContentHash
      INTO #Candidates
      FROM dbo.HuongDanSuDung h
      INNER JOIN dbo.ThietBi d ON d.ThietBiID = h.ThietBiID;

      -- Only combine equal content. Conflicting instructions for a model stay
      -- device-specific, so a distinct manual is never discarded.
      SELECT c.LoaiThietBiID, c.ModelApDung, MIN(c.HuongDanID) AS KeepId
      INTO #Groups
      FROM #Candidates c
      WHERE NOT EXISTS (
        SELECT 1 FROM dbo.HuongDanSuDung shared
        WHERE shared.ThietBiID IS NULL AND shared.LoaiThietBiID = c.LoaiThietBiID
          AND ISNULL(shared.ModelApDung, N'') = c.ModelApDung
      )
      GROUP BY c.LoaiThietBiID, c.ModelApDung
      HAVING COUNT(DISTINCT c.ContentHash) = 1;

      INSERT INTO dbo.HuongDanSuDung_TruocGop
        (HuongDanID, ThietBiID, TieuDe, NoiDung, NgayTao, LoaiThietBiID, ModelApDung)
      SELECT h.HuongDanID, h.ThietBiID, h.TieuDe, h.NoiDung, h.NgayTao, h.LoaiThietBiID, h.ModelApDung
      FROM dbo.HuongDanSuDung h
      INNER JOIN #Candidates c ON c.HuongDanID = h.HuongDanID
      INNER JOIN #Groups g ON g.LoaiThietBiID = c.LoaiThietBiID AND g.ModelApDung = c.ModelApDung
      WHERE NOT EXISTS (SELECT 1 FROM dbo.HuongDanSuDung_TruocGop b WHERE b.HuongDanID = h.HuongDanID);

      UPDATE h SET ThietBiID = NULL, LoaiThietBiID = g.LoaiThietBiID,
        ModelApDung = NULLIF(g.ModelApDung, N''),
        TieuDe = LEFT(CONCAT(N'Hướng dẫn sử dụng ', category.TenLoai,
          CASE WHEN g.ModelApDung = N'' THEN N'' ELSE CONCAT(N' — ', g.ModelApDung) END), 200)
      FROM dbo.HuongDanSuDung h
      INNER JOIN #Groups g ON g.KeepId = h.HuongDanID
      INNER JOIN dbo.LoaiThietBi category ON category.LoaiThietBiID = g.LoaiThietBiID;

      DELETE h FROM dbo.HuongDanSuDung h
      INNER JOIN #Candidates c ON c.HuongDanID = h.HuongDanID
      INNER JOIN #Groups g ON g.LoaiThietBiID = c.LoaiThietBiID AND g.ModelApDung = c.ModelApDung
      WHERE h.HuongDanID <> g.KeepId;

      -- The baseline manuals contain general instructions for the whole type,
      -- so newly added devices also inherit them even when their model is blank.
      UPDATE h SET ModelApDung = NULL,
        TieuDe = LEFT(CONCAT(N'Hướng dẫn sử dụng ', category.TenLoai), 200)
      FROM dbo.HuongDanSuDung h
      INNER JOIN dbo.LoaiThietBi category ON category.LoaiThietBiID = h.LoaiThietBiID
      WHERE h.ThietBiID IS NULL AND h.ModelApDung IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM dbo.HuongDanSuDung_TruocGop archived
          INNER JOIN dbo.ThietBi d ON d.ThietBiID = archived.ThietBiID
          WHERE archived.HuongDanID = h.HuongDanID AND d.MaThietBi LIKE N'TDMU-BASE-%'
        )
        AND NOT EXISTS (
          SELECT 1 FROM dbo.HuongDanSuDung other
          LEFT JOIN dbo.ThietBi d ON d.ThietBiID = other.ThietBiID
          WHERE other.HuongDanID <> h.HuongDanID
            AND COALESCE(other.LoaiThietBiID, d.LoaiThietBiID) = h.LoaiThietBiID
        );

      SELECT @Before AS beforeCount, COUNT(*) AS afterCount,
        SUM(CASE WHEN ThietBiID IS NULL THEN 1 ELSE 0 END) AS sharedCount
      FROM dbo.HuongDanSuDung;
    `);
        await transaction.commit();
        return result.recordset[0];
    }
    catch (error) {
        await transaction.rollback().catch(() => undefined);
        throw error;
    }
}

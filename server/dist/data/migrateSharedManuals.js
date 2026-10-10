"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
const sharedManuals_1 = require("./sharedManuals");
dotenv_1.default.config();
async function run() {
    const pool = await mssql_1.default.connect({
        server: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 1434),
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'quanlythietbi',
        options: { encrypt: false, trustServerCertificate: true }
    });
    try {
        console.log(JSON.stringify(await (0, sharedManuals_1.consolidateSharedManuals)(pool)));
    }
    finally {
        await pool.close();
    }
}
run().catch(error => {
    console.error('Không thể gộp hướng dẫn:', error.message);
    process.exitCode = 1;
});

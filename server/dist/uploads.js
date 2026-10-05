"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsDirectory = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.uploadsDirectory = path_1.default.resolve(process.env.UPLOADS_DIR || path_1.default.join(__dirname, '../uploads'));
fs_1.default.mkdirSync(exports.uploadsDirectory, { recursive: true });

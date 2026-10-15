"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMobileGoogleRouter = createMobileGoogleRouter;
const express_1 = require("express");
const node_crypto_1 = require("node:crypto");
const mobileGoogle_1 = require("../auth/mobileGoogle");
function createMobileGoogleRouter(createSession, flow = new mobileGoogle_1.MobileGoogleFlow()) {
    const router = (0, express_1.Router)();
    router.use((_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        next();
    });
    router.post('/start', (req, res) => {
        try {
            return res.json({ success: true, data: flow.start(req.body?.code_challenge) });
        }
        catch (error) {
            return res.status(error instanceof mobileGoogle_1.MobileGoogleError ? error.status : 503).json({ success: false,
                message: error instanceof mobileGoogle_1.MobileGoogleError ? error.message : 'Không thể bắt đầu đăng nhập Google.' });
        }
    });
    router.get('/callback', async (req, res) => {
        try {
            const url = await flow.callback(req.query.state, req.query.code, req.query.error);
            const nonce = (0, node_crypto_1.randomBytes)(16).toString('base64');
            res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`);
            const href = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            // Android browsers may require a user gesture to launch a custom scheme.
            // Keep a visible return link as a fallback to the automatic transition.
            return res.type('html').send(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quay lại Quản lý thiết bị</title></head><body><h1>Quay lại ứng dụng</h1><p>Nếu app chưa tự mở, hãy bấm liên kết bên dưới.</p><p><a href="${href}">Mở ứng dụng Quản lý thiết bị</a></p><script nonce="${nonce}">window.location.replace(${JSON.stringify(url)});</script></body></html>`);
        }
        catch (error) {
            return res.status(400).type('text').send(error instanceof mobileGoogle_1.MobileGoogleError ? error.message : 'Không thể hoàn tất đăng nhập. Hãy quay lại app và thử lại.');
        }
    });
    router.post('/exchange', async (req, res) => {
        try {
            const identity = flow.redeem(req.body?.code, req.body?.state, req.body?.code_verifier);
            const session = await createSession(identity);
            return res.json({ success: true, message: 'Đăng nhập Google thành công!', data: session });
        }
        catch (error) {
            return res.status(error instanceof mobileGoogle_1.MobileGoogleError ? error.status : 503).json({ success: false,
                message: error instanceof mobileGoogle_1.MobileGoogleError ? error.message : 'Không thể tạo phiên đăng nhập. Hãy thử lại.' });
        }
    });
    return router;
}

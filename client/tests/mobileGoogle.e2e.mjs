// Fake API + fake native bridge only. No live database or Google account is used.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.env.GOOGLE_TEST_URL || 'http://127.0.0.1:4175';
const state = 's'.repeat(43);
const code = 'c'.repeat(43);
const user = { id: 12, username: 'google_test', email: 'student@example.test', full_name: 'Sinh viên kiểm thử Google', role_name: 'STUDENT', permissions: ['CREATE_REPORT'] };
const browser = await chromium.launch({ channel: 'msedge', headless: true });

async function prepare(native) {
  const context = await browser.newContext({ viewport: { width: native ? 375 : 1366, height: 812 } });
  const log = { challenge: '', exchanges: 0, webLogins: 0, gsiLoads: 0 };
  if (native) await context.addInitScript(() => {
    window.androidBridge = {};
    window.__listeners = new Map();
    window.__opened = [];
    let next = 0;
    window.Capacitor = {
      PluginHeaders: [
        { name: 'App', methods: [{ name: 'getLaunchUrl', rtype: 'promise' }, { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }] },
        { name: 'Browser', methods: [{ name: 'open', rtype: 'promise' }, { name: 'close', rtype: 'promise' }] }
      ],
      nativePromise: async (plugin, method, options) => {
        if (plugin === 'App' && method === 'getLaunchUrl') return { url: localStorage.getItem('test_google_launch_url') || undefined };
        if (plugin === 'Browser' && method === 'open') window.__opened.push(options.url);
        if (method === 'removeListener') window.__listeners.delete(options.callbackId);
        return {};
      },
      nativeCallback: (_plugin, _method, _options, callback) => {
        const id = String(++next);
        window.__listeners.set(id, callback);
        return Promise.resolve(id);
      }
    };
  });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/')) {
      const endpoint = url.pathname.split('/api/')[1];
      let data = [];
      if (endpoint === 'auth/google/mobile/start') {
        log.challenge = route.request().postDataJSON().code_challenge;
        data = { state, authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?state=${state}` };
      } else if (endpoint === 'auth/google/mobile/exchange') {
        const body = route.request().postDataJSON();
        assert.equal(body.code, code);
        assert.equal(body.state, state);
        assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'), log.challenge);
        log.exchanges++;
        data = { token: 'test-app-token', user };
      } else if (endpoint === 'auth/google') {
        assert.equal(route.request().postDataJSON().credential, 'test-web-google-token');
        log.webLogins++;
        data = { token: 'test-web-token', user };
      } else if (endpoint === 'auth/login') {
        assert.equal(route.request().postDataJSON().username, 'test-student');
        data = { token: 'test-password-token', user };
      } else if (endpoint === 'auth/me') data = user;
      else if (endpoint === 'stats') data = { totalDevices: 0, totalRooms: 0 };
      return route.fulfill({ json: { success: true, data } });
    }
    if (url.hostname === 'accounts.google.com' && url.pathname === '/gsi/client') {
      log.gsiLoads++;
      return route.fulfill({ contentType: 'application/javascript', body: `window.google={accounts:{id:{initialize:o=>window.__googleCallback=o.callback,renderButton:e=>{const b=document.createElement('button');b.textContent='Google web test';b.onclick=()=>window.__googleCallback({credential:'test-web-google-token'});e.appendChild(b)}}}};` });
    }
    if (url.origin === new URL(base).origin) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/#/login`);
  return { context, page, log, errors };
}
async function returnToApp(page, url) {
  await page.evaluate(url => { for (const callback of window.__listeners.values()) callback({ url }); }, url);
}
try {
  const android = await prepare(true);
  await android.page.getByRole('button', { name: 'Đăng nhập bằng Google', exact: true }).click();
  await android.page.waitForFunction(() => window.__opened.length === 1);
  assert.equal(android.log.gsiLoads, 0, 'Android must never load the GIS WebView button');
  assert.equal(new URL((await android.page.evaluate(() => window.__opened))[0]).hostname, 'accounts.google.com');
  await returnToApp(android.page, `quanlythietbi://auth/google?state=${'x'.repeat(43)}&code=${code}`);
  assert.equal(android.log.exchanges, 0, 'Foreign state cannot log in');
  await returnToApp(android.page, `quanlythietbi://auth/google?state=${state}&code=${code}`);
  await android.page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
  assert.equal(android.log.exchanges, 1);
  assert.equal(await android.page.evaluate(() => localStorage.getItem('google_browser_attempt')), null);
  await returnToApp(android.page, `quanlythietbi://auth/google?state=${state}&code=${code}`);
  assert.equal(android.log.exchanges, 1, 'Duplicate return must not redeem twice');
  assert.deepEqual(android.errors, []);
  await android.context.close();
  console.log('PASS Android bridge: system browser, state, proof exchange, shared session and replay');

  const cancelled = await prepare(true);
  await cancelled.page.getByRole('button', { name: 'Đăng nhập bằng Google', exact: true }).click();
  await cancelled.page.waitForFunction(() => window.__opened.length === 1);
  await returnToApp(cancelled.page, `quanlythietbi://auth/google?state=${state}&error=cancelled`);
  await cancelled.page.getByText('Bạn đã hủy đăng nhập Google.', { exact: true }).waitFor();
  assert.equal(cancelled.log.exchanges, 0);
  assert.equal(await cancelled.page.evaluate(() => localStorage.getItem('auth_token')), null);
  assert.deepEqual(cancelled.errors, []);
  await cancelled.context.close();
  console.log('PASS Android cancellation: no session, clear attempt and readable message');

  const cold = await prepare(true);
  await cold.page.getByRole('button', { name: 'Đăng nhập bằng Google', exact: true }).click();
  await cold.page.waitForFunction(() => window.__opened.length === 1);
  await cold.page.evaluate(url => localStorage.setItem('test_google_launch_url', url), `quanlythietbi://auth/google?state=${state}&code=${code}`);
  await cold.page.reload();
  await cold.page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
  assert.equal(cold.log.exchanges, 1, 'Cold start must exchange once even under StrictMode');
  assert.equal(await cold.page.evaluate(() => localStorage.getItem('google_browser_attempt')), null);
  assert.deepEqual(cold.errors, []);
  await cold.context.close();
  console.log('PASS Android cold start: persisted proof and launch URL restore session');

  const web = await prepare(false);
  await web.page.getByRole('button', { name: 'Google web test' }).click();
  await web.page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
  assert.equal(web.log.webLogins, 1);
  assert.equal(web.log.exchanges, 0);
  assert.deepEqual(web.errors, []);
  await web.context.close();
  console.log('PASS Web: existing Google button and API preserved');

  const password = await prepare(true);
  await password.page.getByPlaceholder('Ví dụ: admin, technician, teacher...').fill('test-student');
  await password.page.getByPlaceholder('Nhập mật khẩu...').fill('test-only-password');
  await password.page.getByRole('button', { name: 'Đăng Nhập', exact: true }).click();
  await password.page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
  assert.equal(await password.page.evaluate(() => localStorage.getItem('auth_token')), 'test-password-token');
  assert.equal(password.log.gsiLoads, 0);
  assert.deepEqual(password.errors, []);
  await password.context.close();
  console.log('PASS Android: password login preserved');
} finally { await browser.close(); }

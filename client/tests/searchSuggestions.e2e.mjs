// All API calls are intercepted. This test never reads/writes the live database.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.env.LAYOUT_TEST_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.LAYOUT_TEST_OUTPUT;
if (outputDir) await mkdir(outputDir, { recursive: true });
const building = { id: 1, building_code: 'A1', name: 'Tòa nhà A1', floors: 3, color: '#0284c7', x: 10, y: 10, width: 100, height: 100, latitude: 10.981, longitude: 106.674 };
const room = { id: 1, building_id: 1, room_number: 'A1-102', name: 'Giảng đường A1-102', building_code: 'A1', floor: 1, x: 10, y: 10, width: 50, height: 50, status: 'ACTIVE', qr_code: 'QR-ROOM-A1-102', latitude: 10.981, longitude: 106.674 };
const device = { id: 1, room_id: 1, category_id: 1, device_code: 'MC-A1-102', name: 'Máy chiếu Epson phòng học A1-102', room_name: room.name, category_name: 'Máy chiếu', model: 'Epson EB-X05', status: 'ACTIVE', qr_code: 'QR-EQ-MC-A1-102' };
const admin = { id: 1, username: 'search-admin', full_name: 'Quản trị viên kiểm thử', role_name: 'ADMIN', permissions: [], email: 'search@example.test' };
const reports = Array.from({ length: 16 }, (_, index) => ({ id: index + 1, report_code: `REPORT-${index + 1}`, status: 'PENDING', priority: 'HIGH', title: `Máy chiếu hỏng ${index + 1}`, description: 'Không hiển thị hình ảnh', room_id: 1, device_id: 1, room_name: room.name, device_name: device.name, reporter_name: admin.full_name, image_urls: [], created_at: '2026-10-13 10:00:00' }));
const log = { id: 1, device_name: device.name, technician_name: 'Kỹ thuật viên kiểm thử', action_taken: 'Đã thay bóng đèn máy chiếu', performed_at: '2026-10-13 10:00:00' };
const manual = { id: 1, category_id: 1, device_id: 1, title: 'Hướng dẫn kết nối máy chiếu Epson', summary: 'Kết nối HDMI cho phòng học', category_name: 'Máy chiếu', quick_faq: [], created_at: '2026-10-13' };
const browser = await chromium.launch({ channel: process.env.LAYOUT_TEST_BROWSER || 'msedge', headless: true });

async function checkPopup(page, input, query, expected, selectValue, keyboard = false) {
  await input.fill(query);
  const list = page.getByRole('listbox');
  await list.waitFor();
  assert.equal(await input.getAttribute('aria-expanded'), 'true');
  const option = list.getByRole('option').filter({ hasText: expected }).first();
  await option.waitFor();
  const bounds = await list.locator('..').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, 'Suggestions must fit phone width');
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1, 'Suggestions must fit viewport height');
  assert.ok(await list.getByRole('option').count() <= 6, 'At most six suggestions');
  if (keyboard) { await input.press('ArrowDown'); await input.press('Enter'); }
  else await option.click();
  assert.equal(await input.inputValue(), selectValue);
  assert.equal(await input.getAttribute('aria-expanded'), 'false');
  assert.equal(await list.count(), 0);
}

try {
  for (const width of [320, 375, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < 768 });
    await context.addInitScript(() => localStorage.setItem('auth_token', 'search-test-only'));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        assert.equal(request.method(), 'GET', 'Autocomplete must not mutate SQL');
        const endpoint = url.pathname.split('/api/')[1];
        const fixtures = { buildings: [building], rooms: [room], devices: [device], pois: [], categories: [{ id: 1, category_name: 'Máy chiếu' }], stats: { totalRooms: 1, totalDevices: 1 }, manuals: [manual], 'incident-reports': reports, 'maintenance-logs': [log], 'auth/me': admin, 'auth/users': [admin] };
        await route.fulfill({ json: { success: true, data: fixtures[endpoint] ?? [] } });
      } else if (url.origin === new URL(baseUrl).origin) await route.continue();
      else await route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${baseUrl}/#/`);
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
    const mapInput = page.getByRole('combobox', { name: 'Tìm phòng, tòa nhà...' });
    await checkPopup(page, mapInput, 'giagn duong', room.name, room.room_number);
    await mapInput.fill('toa nha');
    await page.getByRole('option', { name: 'Tòa nhà A1 A1', exact: true }).waitFor();
    await mapInput.press('Escape');
    assert.equal(await page.getByRole('listbox').count(), 0);
    await checkPopup(page, page.getByRole('combobox', { name: 'Tìm số phòng (vd: A.301, B.201)...' }), 'a1102', room.name, room.room_number);

    await page.goto(`${baseUrl}/#/manuals`);
    await checkPopup(page, page.getByRole('combobox', { name: /^Tìm hướng dẫn/ }), 'may chieuo', manual.title, manual.title, true);
    await page.getByRole('heading', { name: manual.title, exact: true }).waitFor();
    const manualsInput = page.getByRole('combobox', { name: /^Tìm hướng dẫn/ });
    await manualsInput.fill('zzzzzzzz');
    await page.getByRole('status').filter({ hasText: 'Không có gợi ý phù hợp' }).waitFor();
    assert.equal(await page.getByRole('option').count(), 0);
    await manualsInput.fill('');
    assert.equal(await page.getByRole('listbox').count(), 0);

    await page.goto(`${baseUrl}/#/admin`);
    const reportInput = page.getByRole('combobox', { name: 'Tìm phiếu báo hỏng...' });
    await page.getByRole('button', { name: 'Sau', exact: true }).click();
    await checkPopup(page, reportInput, 'may chieu hong 1', 'Máy chiếu hỏng 1', 'REPORT-1');
    await page.getByText('REPORT-1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Quản lý thiết bị', exact: true }).click();
    const deviceInput = page.getByRole('combobox', { name: 'Tìm thiết bị, phòng, mã QR...' });
    await deviceInput.fill('may chieuo');
    await page.getByRole('option').filter({ hasText: device.name }).waitFor();
    if (outputDir) await page.screenshot({ path: path.join(outputDir, `search-${width}.png`) });
    if (width < 768) await page.getByRole('option').filter({ hasText: device.name }).tap();
    else await page.getByRole('option').filter({ hasText: device.name }).click();
    assert.equal(await deviceInput.inputValue(), device.device_code);
    await page.getByRole('table').getByText(device.name, { exact: true }).waitFor();
    await deviceInput.fill('may');
    await deviceInput.press('Tab');
    assert.equal(await page.getByRole('listbox').count(), 0);
    await page.getByRole('button', { name: 'Quản lý phòng', exact: true }).click();
    await checkPopup(page, page.getByRole('combobox', { name: 'Tìm mã phòng, tên phòng, tòa...' }), 'giang duong', room.name, room.room_number);
    await page.getByRole('button', { name: /^Quản lý tòa \(/ }).click();
    await checkPopup(page, page.getByRole('combobox', { name: 'Tìm mã tòa, tên tòa...' }), 'toa nha', building.name, building.building_code);
    await page.getByRole('button', { name: 'Nhật ký bảo trì', exact: true }).click();
    await checkPopup(page, page.getByRole('combobox', { name: 'Tìm nhật ký bảo trì...' }), 'bong den', log.action_taken, log.action_taken);
    await page.getByRole('button', { name: 'Phân quyền tài khoản', exact: true }).click();
    await checkPopup(page, page.getByRole('combobox', { name: 'Tìm tài khoản...' }), 'quan tri', admin.full_name, admin.username);
    await page.goto(`${baseUrl}/#/qr-scanner`);
    const qrInput = page.getByRole('combobox', { name: 'Nhập mã hoặc tên...' });
    await checkPopup(page, qrInput, 'giang duong', room.name, room.room_number);
    assert.equal(await page.getByRole('combobox').filter({ has: page.locator('option') }).inputValue(), String(room.id));
    await page.getByRole('button', { name: 'QR thiết bị', exact: true }).click();
    await checkPopup(page, qrInput, 'may chieuo', device.name, device.device_code);
    const guestContext = await browser.newContext({ viewport: { width, height: 800 } });
    await guestContext.route('**/api/**', route => route.fulfill({ json: { success: true, data: [] } }));
    const guest = await guestContext.newPage();
    await guest.goto(`${baseUrl}/#/qr-scanner`);
    await guest.getByRole('button', { name: 'Bật Camera Quét QR', exact: true }).waitFor();
    assert.equal(await guest.getByRole('combobox', { name: 'Nhập mã hoặc tên...' }).count(), 0, 'Guests cannot autocomplete admin QR data');
    await guestContext.close();
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: all 10 search boxes, typo/accent matches, selection, keyboard, touch, empty state, pagination, permissions`);
    await context.close();
  }
} finally { await browser.close(); }

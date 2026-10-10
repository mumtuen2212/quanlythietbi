// Run against a local build preview. All API responses are fixtures; no real SQL is used.
// Requires Playwright (or NODE_PATH pointing to a runtime that provides it).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const baseUrl = process.env.LAYOUT_TEST_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.LAYOUT_TEST_OUTPUT;
if (outputDir) await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.LAYOUT_TEST_BROWSER || 'msedge', headless: true });
const stats = { totalRooms: 237, totalDevices: 2844, activeDevices: 2843, pendingReports: 1, deviceHealthRatio: 100 };
const building = { id: 1, building_code: 'A1', name: 'Tòa nhà A1', x: 10, y: 10, width: 100, height: 100, floors: 3, color: '#0284c7', latitude: 10.981, longitude: 106.674 };
const room = { id: 1, building_id: 1, room_number: 'A1-102', name: 'Giảng đường A1-102', floor: 1, x: 10, y: 10, width: 50, height: 50, status: 'ACTIVE', qr_code: 'QR-ROOM-A1-102', latitude: 10.981, longitude: 106.674 };
const admin = { id: 1, username: 'layout-admin', full_name: 'Quản trị viên kiểm thử', role_name: 'ADMIN', permissions: [], email: 'layout@example.test' };
const device = { id: 1, room_id: 1, category_id: 1, device_code: 'TDMU-TB-000000001', name: 'Bóng đèn LED phòng học giảng đường A1-102', room_name: room.name, category_name: 'Đèn chiếu sáng', model: 'Model-102', status: 'ACTIVE', qr_code: 'QR-EQ-TDMU-TB-000000001' };
const reports = ['OPEN', 'RESOLVED'].map((status, index) => ({
  id: index + 1, report_code: `REPORT-${index + 1}`, status, priority: 'HIGH',
  title: 'Thiết bị phòng học cần kiểm tra', description: 'Máy chiếu không hiển thị hình ảnh, cần kiểm tra kết nối.',
  created_at: '2026-10-10 11:18:41', room_id: 1, device_id: 1, room_name: room.name,
  device_name: device.name, reporter_name: admin.full_name, reporter_phone: '0123456789', image_urls: [],
}));
const logs = [{ id: 1, device_id: 1, device_name: device.name, technician_name: 'Kỹ thuật viên kiểm thử', performed_at: '2026-10-10 11:18:41', action_taken: 'Đã kiểm tra kết nối máy chiếu.' }];

async function assertLayout(page, mobile) {
  const layout = await page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const menu = document.querySelector('.mobile-bottom-nav');
    const main = document.querySelector('.app-content');
    const rect = element => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, height: box.height };
    };
    const headerControls = [...header.querySelectorAll('a, button')]
      .filter(element => element.getClientRects().length)
      .map(element => ({ ...rect(element), onTop: header.contains(document.elementFromPoint(element.getBoundingClientRect().left + element.clientWidth / 2, element.getBoundingClientRect().top + element.clientHeight / 2)) }));
    return {
      width: innerWidth, height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      header: rect(header), menu: rect(menu),
      menuVisible: getComputedStyle(menu).display !== 'none',
      menuOnTop: menu.contains(document.elementFromPoint(innerWidth / 2, innerHeight - 30)),
      menuOutsideHeader: !header.contains(menu),
      paddingBottom: parseFloat(getComputedStyle(main).paddingBottom),
      headerControls,
    };
  });
  assert.ok(layout.scrollWidth <= layout.width + 1, `Horizontal overflow: ${JSON.stringify(layout)}`);
  assert.ok(layout.header.top >= -1 && layout.header.top <= 1, 'Sticky header must stay at the top');
  assert.ok(layout.headerControls.every(control => control.left >= 0 && control.right <= layout.width + 1 && control.onTop), 'Header controls must fit and stay above the map');
  assert.equal(layout.menuOutsideHeader, true);
  assert.equal(layout.menuVisible, mobile);
  if (mobile) {
    assert.ok(Math.abs(layout.menu.bottom - layout.height) <= 1, 'Mobile navigation must stay at viewport bottom');
    assert.ok(layout.menu.height >= 64 && layout.menu.top > layout.header.bottom, 'Header and bottom navigation must not overlap');
    assert.equal(layout.menuOnTop, true, 'Map must not cover bottom navigation');
    assert.ok(layout.paddingBottom >= layout.menu.height, 'Content needs space for bottom navigation');
  }
}

try {
  for (const width of [320, 375, 768, 1366]) {
    for (const signedIn of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      await context.route('**/api/**', async route => {
        assert.equal(route.request().method(), 'GET', 'Layout tests must not mutate data');
        const endpoint = new URL(route.request().url()).pathname.split('/api/')[1];
        const data = ({ stats, buildings: [building], rooms: [room], pois: [], devices: [device], categories: [{ id: 1, name: 'Máy chiếu' }], 'incident-reports': reports, 'maintenance-logs': logs, 'auth/me': admin, 'auth/users': [admin] })[endpoint] ?? [];
        await route.fulfill({ json: { success: true, data } });
      });
      // Avoid requests to public map tile servers during repeatable layout checks.
      await context.route(/^https:\/\/(?:[^/]+\.)?tile\.openstreetmap\.org\//, route => route.fulfill({
        contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1cAAAAASUVORK5CYII=', 'base64'),
      }));
      await context.addInitScript(isAdmin => {
        if (isAdmin) localStorage.setItem('auth_token', 'layout-test-only');
      }, signedIn);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${baseUrl}/#/`);
      await page.locator('.leaflet-container').waitFor();
      await page.getByText('2844', { exact: true }).waitFor();
      if (signedIn) await page.getByRole('button', { name: 'Đăng xuất', exact: true }).waitFor();
      // Initial fitBounds and zoom animations start on an animation frame.
      await page.waitForTimeout(400);
      await page.locator('.leaflet-container').evaluate(element => {
        scrollTo(0, scrollY + element.getBoundingClientRect().top - 80);
      });
      await assertLayout(page, width < 1024);
      if (width < 1024) assert.equal(await page.locator('.mobile-bottom-nav a').count(), signedIn ? 5 : 4);
      if (outputDir && width === 320 && !signedIn) await page.screenshot({ path: path.join(outputDir, 'mobile-home.png') });
      await page.locator('.leaflet-control-zoom-in').click();
      await page.waitForTimeout(400);
      await page.waitForFunction(() => !document.querySelector('.leaflet-container.leaflet-zoom-anim'));
      await page.locator('.leaflet-container').evaluate(element => {
        scrollTo(0, scrollY + element.getBoundingClientRect().top + 120);
      });
      await assertLayout(page, width < 1024);
      if (outputDir && width === 320 && !signedIn) await page.screenshot({ path: path.join(outputDir, 'mobile-scrolled.png') });
      if (!signedIn) {
        await page.locator('.app-header a[href="#/login"]').click();
        await page.getByRole('heading', { name: 'Đăng Nhập Hệ Thống' }).waitFor();
        await assertLayout(page, width < 1024);
      }
      if (width < 1024) {
        await page.locator('.mobile-bottom-nav a[href="#/report-incident"]').click();
        await page.getByText('Gửi Phiếu Báo Hỏng Ngay', { exact: true }).waitFor();
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await assertLayout(page, true);
        const submit = await page.getByText('Gửi Phiếu Báo Hỏng Ngay', { exact: true }).boundingBox();
        const menu = await page.locator('.mobile-bottom-nav').boundingBox();
        assert.ok(submit.y + submit.height <= menu.y, 'Bottom navigation must not hide the report submit button');
      }
      if (signedIn) {
        await page.goto(`${baseUrl}/#/admin`);
        await page.getByText('REPORT-1', { exact: true }).waitFor();
        await page.evaluate(() => scrollTo(0, 0));
        if (outputDir && width === 320) await page.screenshot({ path: path.join(outputDir, 'mobile-admin.png'), fullPage: true });
        await assertLayout(page, width < 1024);
        for (const tab of ['Quản lý thiết bị', 'Quản lý phòng', 'Nhật ký bảo trì', 'Phân quyền tài khoản']) {
          await page.getByRole('button', { name: tab, exact: true }).click();
          if (tab === 'Phân quyền tài khoản') await page.getByText('@layout-admin', { exact: true }).waitFor();
          await page.evaluate(() => scrollTo(0, 0));
          await assertLayout(page, width < 1024);
          for (const scroller of await page.locator('.admin-dashboard .overflow-x-auto').all()) {
            const bounds = await scroller.boundingBox();
            assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${tab}: Table scroller must fit inside viewport`);
            const tableLayout = await scroller.evaluate(element => {
              const table = element.querySelector('table');
              return {
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                tableWidth: table.getBoundingClientRect().width,
                headerHeight: table.querySelector('thead').getBoundingClientRect().height,
                firstRowHeight: table.querySelector('tbody tr')?.getBoundingClientRect().height,
                headersStayOnOneLine: [...table.querySelectorAll('th')].every(cell => getComputedStyle(cell).whiteSpace === 'nowrap'),
              };
            });
            assert.equal(tableLayout.headersStayOnOneLine, true, `${tab}: Column titles must not wrap into vertical letters`);
            assert.ok(tableLayout.headerHeight <= 64, `${tab}: Table header must remain readable: ${JSON.stringify(tableLayout)}`);
            // Permission rows legitimately contain a long list of checkboxes.
            if (tab !== 'Phân quyền tài khoản') {
              assert.ok(tableLayout.firstRowHeight < 220, `${tab}: Rows must not turn into tall columns of letters: ${JSON.stringify(tableLayout)}`);
            }
            if (width < 768) {
              assert.ok(tableLayout.scrollWidth > tableLayout.clientWidth, `${tab}: Wide tables must scroll inside their container`);
              const scrollLeft = await scroller.evaluate(element => {
                element.scrollLeft = element.scrollWidth;
                return element.scrollLeft;
              });
              assert.ok(scrollLeft > 0, `${tab}: All columns must be reachable by horizontal scrolling`);
              if (tab === 'Quản lý thiết bị') {
                const editButton = await page.getByTitle('Sửa thiết bị', { exact: true }).boundingBox();
                assert.ok(editButton.x >= bounds.x && editButton.x + editButton.width <= bounds.x + bounds.width + 1, 'Device actions must be reachable at the right end of the table');
                const codeCell = await page.getByText(device.device_code, { exact: true }).boundingBox();
                assert.ok(codeCell.height < 100, 'Device codes must not wrap into one character per line');
              }
              await assertLayout(page, width < 1024);
            }
          }
          if (outputDir && width === 320 && tab === 'Quản lý thiết bị') {
            await page.getByRole('region', { name: 'Bảng quản lý thiết bị', exact: true }).evaluate(element => {
              scrollTo(0, scrollY + element.getBoundingClientRect().top - 100);
            });
            await page.screenshot({ path: path.join(outputDir, 'mobile-admin-devices-actions.png') });
            await page.locator('.admin-dashboard .overflow-x-auto').evaluate(element => { element.scrollLeft = 0; });
            await page.screenshot({ path: path.join(outputDir, 'mobile-admin-devices.png') });
          }
        }
        await page.getByRole('button', { name: 'Quản lý phòng', exact: true }).click();
        await page.getByRole('button', { name: /^Quản lý tòa \(/ }).click();
        await assertLayout(page, width < 1024);
      }
      assert.deepEqual(errors, [], 'No browser runtime errors');
      console.log(`PASS ${width}px ${signedIn ? 'admin (all dashboard tabs)' : 'guest'}: header, map layers, navigation, content spacing`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

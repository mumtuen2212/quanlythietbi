import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { ApiService } from './api';
import { AuthResponse } from '../types';
import { createGoogleProof, GOOGLE_ATTEMPT_KEY, GOOGLE_ATTEMPT_TTL, parseGoogleReturn, readGoogleAttempt } from './mobileGoogleProtocol';

export const usesGoogleSystemBrowser = () => Capacitor.getPlatform() === 'android';

export async function beginGoogleBrowserLogin(returnPath: string) {
  if (!usesGoogleSystemBrowser()) throw new Error('Luồng trình duyệt hệ thống chỉ dành cho app Android.');
  const { verifier, challenge } = await createGoogleProof();
  // Invalidate any old attempt before starting another account selection.
  localStorage.removeItem(GOOGLE_ATTEMPT_KEY);
  try {
    const result = await ApiService.startGoogleBrowserLogin(challenge);
    const url = new URL(result.authorizationUrl);
    if (!/^[A-Za-z0-9_-]{43}$/.test(result.state) || url.protocol !== 'https:' || url.hostname !== 'accounts.google.com' ||
        url.pathname !== '/o/oauth2/v2/auth' || url.username || url.password || url.hash || url.searchParams.get('state') !== result.state) {
      throw new Error('Server trả về địa chỉ đăng nhập Google không hợp lệ.');
    }
    localStorage.setItem(GOOGLE_ATTEMPT_KEY, JSON.stringify({ state: result.state, verifier,
      returnPath: returnPath.startsWith('/') && !returnPath.startsWith('//') ? returnPath : '/', expires: Date.now() + GOOGLE_ATTEMPT_TTL }));
    await Browser.open({ url: url.toString() }); // Chrome Custom Tabs on Android, not WebView.
  } catch (error: any) {
    localStorage.removeItem(GOOGLE_ATTEMPT_KEY);
    if (error.response?.status === 404) throw new Error('Server chưa cập nhật chức năng Google cho app. Cần deploy backend mới.');
    throw error;
  }
}

export async function listenForGoogleBrowserLogin(
  success: (session: AuthResponse, returnPath: string) => void,
  failure: (message: string) => void,
  signal?: AbortSignal
) {
  let processing = false;
  let disposed = false;
  const receive = async (url: string) => {
    const result = parseGoogleReturn(url);
    if (!result || processing || disposed || signal?.aborted) return;
    const attempt = readGoogleAttempt(localStorage.getItem(GOOGLE_ATTEMPT_KEY));
    // Ignore foreign or replayed links: a link alone cannot log a user in.
    if (!attempt || attempt.state !== result.state) return;
    processing = true;
    try {
      if (result.error) throw new Error(result.error === 'cancelled' ? 'Bạn đã hủy đăng nhập Google.' : 'Không thể xác thực Google. Hãy thử lại; nếu vẫn lỗi, kiểm tra cấu hình callback trên server.');
      const session = await ApiService.exchangeGoogleBrowserLogin(result.code!, result.state, attempt.verifier);
      if (!session || typeof session.token !== 'string' || !session.token || !session.user?.id) throw new Error('Server trả về phiên đăng nhập không hợp lệ.');
      if (!disposed && !signal?.aborted && readGoogleAttempt(localStorage.getItem(GOOGLE_ATTEMPT_KEY))?.state === attempt.state) success(session, attempt.returnPath);
    } catch (error: any) {
      if (!disposed && !signal?.aborted && readGoogleAttempt(localStorage.getItem(GOOGLE_ATTEMPT_KEY))?.state === attempt.state) failure(error.response?.data?.message || error.message || 'Không thể hoàn tất đăng nhập Google.');
    } finally {
      // Do not clear a newer attempt started while this exchange was running.
      if (readGoogleAttempt(localStorage.getItem(GOOGLE_ATTEMPT_KEY))?.state === attempt.state) localStorage.removeItem(GOOGLE_ATTEMPT_KEY);
      processing = false;
      await Browser.close().catch(() => {}); // Android closes/returns via deep link; close() is iOS-only.
    }
  };
  const handle = await App.addListener('appUrlOpen', event => { void receive(event.url); });
  if (signal?.aborted) { await handle.remove(); return () => {}; }
  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url && !signal?.aborted) void receive(launch.url); // Also handles app cold start.
  } catch (error) { await handle.remove(); throw error; }
  return () => { disposed = true; void handle.remove(); };
}

import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiService } from '../services/api';
import type { Device, Room } from '../types';

export const QRCodeGenerator: React.FC = () => {
  const { hasPermission } = useAuth();
  const canRoom = hasPermission('MANAGE_ROOMS'), canDevice = hasPermission('MANAGE_DEVICES');
  const [type, setType] = useState<'room' | 'device'>(canRoom ? 'room' : 'device');
  const [rooms, setRooms] = useState<Room[]>([]), [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState(''), [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<{ code: string; name: string } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [r, d] = await Promise.all([canRoom ? ApiService.getRooms() : Promise.resolve([]), canDevice ? ApiService.getDevices() : Promise.resolve([])]);
      setRooms(r); setDevices(d);
    } catch { setError('Không tải được danh sách. Kiểm tra server và bấm tải lại.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (canRoom || canDevice) void load(); }, [canRoom, canDevice]);
  useEffect(() => {
    if (!canRoom && type === 'room') setType('device');
    if (!canDevice && type === 'device' && canRoom) setType('room');
  }, [canRoom, canDevice, type]);
  useEffect(() => { setSelectedId(''); setGenerated(null); setSearch(''); }, [type]);
  if (!canRoom && !canDevice) return null;
  const targets = type === 'room' ? rooms : devices;
  const label = (item: Room | Device) => 'room_number' in item ? `${item.room_number} — ${item.name}` : `${item.device_code} — ${item.name}${item.room_name ? ` (${item.room_name})` : ''}`;
  const filtered = targets.filter(item => String(item.id) === selectedId || label(item).toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const generate = async () => {
    setSaving(true); setError(''); setGenerated(null);
    try { setGenerated(await ApiService.createQrCode(type, Number(selectedId))); }
    catch (err: any) { setError(err.response?.data?.message || 'Không thể tạo QR. Hãy kiểm tra kết nối rồi thử lại.'); }
    finally { setSaving(false); }
  };
  const download = () => {
    const svg = previewRef.current?.querySelector('svg');
    if (!svg || !generated) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `QR-${type}-${selectedId}.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="rounded-3xl border border-sky-200 bg-white p-6 shadow-sm space-y-5">
    <div className="flex items-center gap-3"><QrCode className="text-sky-600" /><div><h2 className="font-extrabold text-slate-900">Tạo mã QR để in tem</h2><p className="text-xs text-slate-500">Chọn phòng hoặc thiết bị. Mã được lưu để quét tra cứu; tạo lại không đổi mã đã in.</p></div></div>
    <div className="flex flex-wrap gap-2">
      {(['room', 'device'] as const).filter(t => t === 'room' ? canRoom : canDevice).map(t => <button type="button" key={t} disabled={saving} onClick={() => setType(t)} className={`rounded-xl px-4 py-2 text-sm font-bold ${type === t ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{t === 'room' ? 'QR phòng' : 'QR thiết bị'}</button>)}
      <button type="button" onClick={() => void load()} disabled={loading || saving} className="ml-auto text-xs font-semibold text-sky-700 flex items-center gap-1"><RefreshCw size={14} />Tải lại danh sách</button>
    </div>
    <label className="block text-sm font-semibold">Tìm {type === 'room' ? 'phòng' : 'thiết bị'}<input value={search} disabled={saving} onChange={e => setSearch(e.target.value)} placeholder="Nhập mã hoặc tên..." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" /></label>
    <label className="block text-sm font-semibold">Chọn {type === 'room' ? 'phòng' : 'thiết bị'}<select value={selectedId} disabled={loading || saving} onChange={e => { setSelectedId(e.target.value); setGenerated(null); }} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"><option value="">{loading ? 'Đang tải...' : '-- Chọn đối tượng --'}</option>{filtered.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
    {!loading && !error && targets.length === 0 && <p className="text-sm text-amber-700">Chưa có dữ liệu trong danh sách này.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <button type="button" disabled={!selectedId || loading || saving} onClick={() => void generate()} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Đang tạo và lưu...' : 'Tạo mã QR'}</button>
    {generated && <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-sky-50 p-4"><div ref={previewRef}><QRCodeSVG value={generated.code} size={180} level="H" includeMargin /></div><div className="space-y-3"><p className="font-bold">{generated.name}</p><code className="block break-all text-sm">{generated.code}</code><button type="button" onClick={download} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-sky-700"><Download size={16} />Tải ảnh QR (SVG)</button><p className="text-xs text-slate-500">In tem rồi quét bằng chức năng Quét QR trên website.</p></div></div>}
  </section>;
};

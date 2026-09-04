import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Wrench, 
  QrCode,
  Layers,
  FileText,
  Volume2,
  Mic,
  ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { QRCodeSVG } from 'qrcode.react';
import { ApiService } from '../services/api';
import { Device, Manual } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'manual' | 'faq' | 'history'>('manual');
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadDeviceData(parseInt(id));
    }
  }, [id]);

  const loadDeviceData = async (devId: number) => {
    try {
      setLoading(true);
      const data = await ApiService.getDeviceById(devId);
      setDevice(data);
    } catch (error) {
      console.error('Error loading device details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Đang tải thông tin thiết bị...</div>;
  }

  if (!device) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-600 font-medium">Không tìm thấy thông tin thiết bị.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const isSisuMic = device.name.toLowerCase().includes('sisu') || device.name.toLowerCase().includes('micro');
  const manual = device.manual;

  return (
    <div className="space-y-8 pb-20 md:pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-sky-600" />
            <span>Mã QR Thiết bị</span>
          </button>

          <Link
            to={`/report-incident?roomId=${device.room_id || ''}&deviceId=${device.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md shadow-rose-600/20 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Báo hỏng thiết bị này</span>
          </Link>
        </div>
      </div>

      {/* Main Header Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                {device.device_code}
              </span>
              <StatusBadge status={device.status} />
              {isSisuMic && (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Bộ Mic Không Dây Xanh</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {device.name}
            </h1>

            <p className="text-slate-600 text-sm">
              Model: <span className="font-semibold text-slate-800">{device.model || 'Chưa cập nhật'}</span>
              {device.serial_number && (
                <> • Số Serial: <span className="font-mono text-slate-700">{device.serial_number}</span></>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
              <span className="bg-slate-100 px-3 py-1 rounded-lg font-medium text-slate-700">
                📍 Vị trí: {device.room_name || 'Kho CSVC'}
              </span>
              <span className="bg-slate-100 px-3 py-1 rounded-lg font-medium text-slate-700">
                📦 Danh mục: {device.category_name}
              </span>
              {device.warranty_expiry && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Bảo hành đến: {device.warranty_expiry}
                </span>
              )}
            </div>
          </div>

          {/* Quick specs box */}
          {device.specifications && Object.keys(device.specifications).length > 0 && (
            <div className="w-full lg:w-80 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 shrink-0">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thông số kỹ thuật</p>
              <div className="space-y-1.5 text-xs">
                {Object.entries(device.specifications).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-slate-500 font-medium">{k}:</span>
                    <span className="text-slate-800 font-semibold text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Manual, FAQ and Maintenance History */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'manual'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Hướng dẫn sử dụng chi tiết</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'faq'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Xử lý lỗi nhanh 30s ({manual?.quick_faq?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all ${
              activeTab === 'history'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Lịch sử bảo trì ({device.history?.length || 0})</span>
          </button>
        </div>

        {/* Tab 1: Detailed Manual */}
        {activeTab === 'manual' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {manual ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{manual.title}</h2>
                  {manual.summary && (
                    <p className="text-sm text-slate-600 mt-1 bg-sky-50 p-3 rounded-xl border border-sky-100 text-sky-800 font-medium">
                      💡 {manual.summary}
                    </p>
                  )}
                </div>

                <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-lg prose-h3:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900">
                  <ReactMarkdown>{manual.content_markdown}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p>Chưa có tài liệu hướng dẫn cho thiết bị này.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Quick FAQ / Troubleshooting */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            {manual && manual.quick_faq && manual.quick_faq.length > 0 ? (
              manual.quick_faq.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-sky-300 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ?
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{item.problem}</h3>
                  </div>

                  <div className="pl-9 space-y-2">
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {item.solution}
                    </p>

                    {item.quick_action && (
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg w-fit">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Thao tác nhanh: {item.quick_action}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                Chưa có danh mục FAQ xử lý nhanh.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Maintenance History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            {device.history && device.history.length > 0 ? (
              <div className="space-y-4">
                {device.history.map(log => (
                  <div key={log.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-700">{log.technician_name}</span>
                      <span>{log.performed_at}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{log.action_taken}</p>
                    {log.parts_replaced && (
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">Linh kiện thay thế:</span> {log.parts_replaced}
                      </p>
                    )}
                    {log.note && <p className="text-xs text-slate-500 italic">{log.note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                Chưa có lịch sử sửa chữa hay bảo dưỡng cho thiết bị này.
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal for Device */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Mã QR Thiết Bị</h3>
              <p className="text-xs text-slate-500 mt-1">{device.name}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
              <QRCodeSVG
                value={device.qr_code}
                size={200}
                bgColor="#f8fafc"
                fgColor="#0369a1"
                level="H"
              />
            </div>

            <p className="font-mono text-xs font-bold text-slate-700 bg-slate-100 py-1.5 rounded-lg">
              {device.qr_code}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors"
              >
                In tem dán
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

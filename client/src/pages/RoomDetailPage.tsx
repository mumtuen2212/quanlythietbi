import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  QrCode, 
  ArrowLeft, 
  AlertTriangle, 
  BookOpen, 
  CheckCircle2, 
  Wrench, 
  Clock, 
  Info,
  ExternalLink,
  Plus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ApiService } from '../services/api';
import { Room, Device, IncidentReport } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadRoomData(parseInt(id));
    }
  }, [id]);

  const loadRoomData = async (roomId: number) => {
    try {
      setLoading(true);
      const [roomData, reportsData] = await Promise.all([
        ApiService.getRoomById(roomId),
        ApiService.getIncidentReports({ room_id: roomId })
      ]);
      setRoom(roomData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading room details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Đang tải thông tin phòng học...</div>;
  }

  if (!room) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-600 font-medium">Không tìm thấy thông tin phòng học.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-sky-600 font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-12">
      {/* Top Breadcrumb & Actions */}
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
            <span>Mã QR Phòng</span>
          </button>

          <Link
            to={`/report-incident?roomId=${room.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md shadow-rose-600/20 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Báo hỏng phòng này</span>
          </Link>
        </div>
      </div>

      {/* Room Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Phòng học {room.room_number}
              </h1>
              <StatusBadge status={room.status} />
            </div>

            <p className="text-slate-600 text-sm font-medium">{room.name}</p>
            <p className="text-slate-500 text-xs flex items-center gap-2">
              <span>{room.building_code ? `Tòa nhà ${room.building_code}` : 'Khu giảng đường'}</span>
              <span>•</span>
              <span>Tầng {room.floor}</span>
              <span>•</span>
              <span>Mã QR: <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">{room.qr_code}</code></span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
            <div className="text-center px-3 border-r border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Thiết bị</p>
              <p className="text-xl font-bold text-slate-900">{room.devices?.length || 0}</p>
            </div>
            <div className="text-center px-3">
              <p className="text-xs text-slate-500 font-medium">Sự cố chờ</p>
              <p className="text-xl font-bold text-rose-600">{room.pendingReportsCount || 0}</p>
            </div>
          </div>
        </div>

        {room.description && (
          <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Ghi chú phòng: </span>
            {room.description}
          </div>
        )}
      </div>

      {/* Devices in this room */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Danh sách Thiết bị trong Phòng ({room.devices?.length || 0})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">Bấm vào thiết bị để xem hướng dẫn sử dụng chi tiết hoặc báo hỏng</p>
          </div>
        </div>

        {(!room.devices || room.devices.length === 0) ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Chưa có thiết bị nào được gán cho phòng này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {room.devices.map(device => {
              const isSisuMic = device.name.toLowerCase().includes('sisu') || device.name.toLowerCase().includes('micro');
              return (
                <div
                  key={device.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                    device.status === 'DAMAGED' 
                      ? 'border-rose-300 ring-2 ring-rose-100' 
                      : 'border-slate-200 hover:border-sky-300'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Device Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {device.device_code}
                          </span>
                          {isSisuMic && (
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Mic Xanh UHF
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {device.name}
                        </h3>
                        <p className="text-xs text-slate-500">Model: {device.model || 'Tiêu chuẩn'}</p>
                      </div>

                      <StatusBadge status={device.status} size="sm" />
                    </div>

                    {/* Specs / Highlights */}
                    {device.specifications && Object.keys(device.specifications).length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {Object.entries(device.specifications).slice(0, 3).map(([key, val]) => (
                          <div key={key} className="flex items-start justify-between gap-2">
                            <span className="text-slate-500 font-medium">{key}:</span>
                            <span className="font-semibold text-slate-800 text-right">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <Link
                      to={`/devices/${device.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Xem HDSD & Lỗi</span>
                    </Link>

                    <Link
                      to={`/report-incident?roomId=${room.id}&deviceId=${device.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Báo hỏng thiết bị</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Incident History in this Room */}
      {reports.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <span>Lịch sử Báo cáo Sự cố Phòng {room.room_number}</span>
          </h2>

          <div className="space-y-3">
            {reports.map(report => (
              <div
                key={report.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">{report.report_code}</span>
                    <StatusBadge status={report.status} size="sm" />
                    <span className="text-xs text-slate-400">• {report.created_at}</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{report.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>
                  {report.solution_note && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg mt-1 font-medium inline-block">
                      💡 Giải pháp: {report.solution_note}
                    </p>
                  )}
                </div>

                <div className="text-xs text-slate-500 sm:text-right shrink-0">
                  <p className="font-medium text-slate-700">{report.reporter_name}</p>
                  <p>{report.reporter_role || 'Giảng viên'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* QR Code Modal for Classroom Printing */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Mã QR Phòng {room.room_number}</h3>
              <p className="text-xs text-slate-500 mt-1">Dán mã này trên bàn giảng viên để quét tra cứu nhanh</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
              <QRCodeSVG
                value={room.qr_code}
                size={200}
                bgColor="#f8fafc"
                fgColor="#0369a1"
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2">
              <p className="font-mono text-xs font-bold text-slate-700 bg-slate-100 py-1.5 rounded-lg">
                {room.qr_code}
              </p>
              <p className="text-[11px] text-slate-400">Giảng viên quét mã này bằng điện thoại để xem ngay hướng dẫn thiết bị và báo hỏng</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors shadow-sm"
              >
                In mã QR
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

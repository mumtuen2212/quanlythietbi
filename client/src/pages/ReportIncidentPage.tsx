import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Upload, 
  CheckCircle2, 
  X, 
  ArrowLeft, 
  Sparkles,
  Phone,
  User,
  Building2,
  Cpu
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Room, Device, IncidentReport } from '../types';

export const ReportIncidentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(searchParams.get('roomId') || '');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(searchParams.get('deviceId') || '');

  // Form State
  const [reporterName, setReporterName] = useState('ThS. Nguyễn Văn Hùng');
  const [reporterPhone, setReporterPhone] = useState('0912.345.678');
  const [reporterRole, setReporterRole] = useState('Giảng viên');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<IncidentReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      loadDevicesForRoom(parseInt(selectedRoomId));
    } else {
      setDevices([]);
      setSelectedDeviceId('');
    }
  }, [selectedRoomId]);

  const loadInitialData = async () => {
    try {
      const roomsData = await ApiService.getRooms();
      setRooms(roomsData);
      if (!selectedRoomId && roomsData.length > 0) {
        setSelectedRoomId(String(roomsData[0].id));
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  };

  const loadDevicesForRoom = async (roomId: number) => {
    try {
      const devs = await ApiService.getDevices({ room_id: roomId });
      setDevices(devs);
      const urlDevId = searchParams.get('deviceId');
      if (urlDevId && devs.some(d => String(d.id) === urlDevId)) {
        setSelectedDeviceId(urlDevId);
      }
    } catch (err) {
      console.error('Error loading devices for room:', err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...filesArray]);
      const newUrls = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedRoomId || !title.trim() || !description.trim() || !reporterName.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('room_id', selectedRoomId);
      if (selectedDeviceId) formData.append('device_id', selectedDeviceId);
      formData.append('reporter_name', reporterName);
      formData.append('reporter_phone', reporterPhone);
      formData.append('reporter_role', reporterRole);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('priority', priority);

      selectedImages.forEach(file => {
        formData.append('images', file);
      });

      const res = await ApiService.createIncidentReport(formData);
      setSuccessReport(res.data);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setErrorMessage(err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo sự cố.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 md:pb-12">
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Báo Cáo Sự Cố & Thiết Bị Hư Hại</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Gửi thông tin hỏng hóc tới bộ phận kỹ thuật để được hỗ trợ sửa chữa và thay thế kịp thời trước giờ học.
        </p>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Room & Device Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>Phòng học xảy ra sự cố *</span>
              </label>
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              >
                <option value="">-- Chọn phòng học --</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.room_number} ({r.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Thiết bị bị hư hỏng</span>
              </label>
              <select
                value={selectedDeviceId}
                onChange={e => setSelectedDeviceId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">-- Sự cố phòng chung / Không rõ thiết bị --</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.device_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reporter Information */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Thông tin người báo</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Họ và tên *</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Số điện thoại *</label>
                <input
                  type="text"
                  value={reporterPhone}
                  onChange={e => setReporterPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Vai trò</label>
                <select
                  value={reporterRole}
                  onChange={e => setReporterRole(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  <option value="Giảng viên">Giảng viên</option>
                  <option value="Sinh viên / Ban cán sự lớp">Sinh viên / BCS Lớp</option>
                  <option value="Cán bộ quản trị">Cán bộ CSVC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tiêu đề sự cố / Tóm tắt lỗi *</label>
              <input
                type="text"
                placeholder="Ví dụ: Micro Sisu màu xanh bị rè và mất tiếng khi nói..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Mô tả chi tiết tình trạng hư hỏng *</label>
              <textarea
                rows={4}
                placeholder="Mô tả cụ thể triệu chứng lỗi (vd: đèn màn hình có sáng không, đã thử bật lại chưa, có tiếng nổ lách tách hay mùi khét không...)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Mức độ ưu tiên xử lý</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'URGENT', label: 'Khẩn cấp (Trước giờ học)', color: 'bg-rose-50 border-rose-300 text-rose-700' },
                  { value: 'HIGH', label: 'Cao (Trong ngày)', color: 'bg-amber-50 border-amber-300 text-amber-700' },
                  { value: 'MEDIUM', label: 'Trung bình', color: 'bg-blue-50 border-blue-300 text-blue-700' },
                  { value: 'LOW', label: 'Thấp (Bảo trì sau)', color: 'bg-slate-50 border-slate-300 text-slate-700' }
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      priority === p.value
                        ? `${p.color} ring-2 ring-offset-1`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Ảnh chụp minh chứng hỏng hóc (Tối đa 5 ảnh)</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-sky-50/20 transition-all">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-600">Bấm để chụp ảnh hoặc tải ảnh từ máy</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG (tối đa 10MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'Đang gửi phiếu...' : 'Gửi Phiếu Báo Hỏng Ngay'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {successReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900">Đã Gửi Báo Cáo Thành Công!</h3>
              <p className="text-xs text-slate-500">
                Phiếu báo hỏng đã được chuyển trực tiếp tới Kỹ thuật viên phụ trách.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã phiếu tra cứu:</span>
                <span className="font-mono font-bold text-sky-700">{successReport.report_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phòng học:</span>
                <span className="font-bold text-slate-800">Phòng {successReport.room_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thiết bị:</span>
                <span className="font-bold text-slate-800">{successReport.device_name || 'Sự cố phòng'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời gian tạo:</span>
                <span className="text-slate-700">{successReport.created_at}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Link
                to={`/rooms/${successReport.room_id}`}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors"
              >
                Về lại phòng học
              </Link>
              <Link
                to="/admin"
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Xem danh sách KTV
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

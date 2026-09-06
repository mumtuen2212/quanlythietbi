import React, { useEffect, useState, useRef } from 'react';
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
  Cpu,
  Camera,
  RefreshCw,
  VideoOff
} from 'lucide-react';
import { ApiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Room, Device, IncidentReport } from '../types';

export const ReportIncidentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Live Camera Preview States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<IncidentReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setReporterName(user.full_name || user.username);
      if (user.phone) setReporterPhone(user.phone);
      setReporterRole(user.role_name === 'TEACHER' ? 'Giảng viên' : user.role_name === 'STUDENT' ? 'Sinh viên' : 'Kỹ thuật viên');
    }
  }, [user]);

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

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      setCameraError(null);
      setIsCameraOpen(true);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Không thể mở camera. Vui lòng cấp quyền truy cập camera trong trình duyệt hoặc sử dụng nút tải ảnh.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `camera-snap-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedImages(prev => [...prev, file]);
        const url = URL.createObjectURL(blob);
        setPreviewUrls(prev => [...prev, url]);
      }
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

            {/* Image Upload & Camera Capture */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Ảnh chụp minh chứng hỏng hóc (Tối đa 5 ảnh)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Camera Capture Button */}
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs shadow-sm shadow-sky-500/25 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp ảnh sự cố bằng Camera</span>
                </button>

                {/* File Upload Trigger */}
                <label className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-sky-50/20 text-slate-600 hover:text-sky-700 font-bold text-xs transition-all text-center">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Tải ảnh có sẵn từ máy</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Camera Error Alert */}
              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Preview Gallery */}
              {previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 cursor-pointer shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Camera Viewfinder Modal */}
            {isCameraOpen && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
                  {/* Camera Header */}
                  <div className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700 text-white">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Camera className="w-4 h-4 text-sky-400" />
                      <span>Khung ngắm Camera trực tiếp</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Video Viewfinder */}
                  <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Target Reticle */}
                    <div className="absolute inset-8 border-2 border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-sky-400/60 rounded-full animate-ping" />
                    </div>
                  </div>

                  {/* Camera Controls Footer */}
                  <div className="p-4 bg-slate-800 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all cursor-pointer"
                      title="Chuyển Camera Trước / Sau"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Đổi camera</span>
                    </button>

                    {/* Shutter Button */}
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-14 h-14 rounded-full bg-white border-4 border-sky-500 hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
                      title="Bấm để chụp ảnh"
                    >
                      <div className="w-10 h-10 rounded-full bg-sky-600" />
                    </button>

                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
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

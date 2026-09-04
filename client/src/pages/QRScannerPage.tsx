import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Camera, 
  Upload, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Mic, 
  Tv, 
  AlertCircle 
} from 'lucide-react';
import { ApiService } from '../services/api';

export const QRScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setErrorMsg(null);
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode('reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // ignore frame errors
        }
      );
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setErrorMsg('Không thể khởi động camera. Vui lòng cấp quyền truy cập camera hoặc thử tải ảnh QR lên.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg(null);
      const html5QrCode = new Html5Qrcode('reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleDetectedCode(decodedText);
    } catch (err) {
      setErrorMsg('Không tìm thấy mã QR hợp lệ trong hình ảnh đã chọn.');
    }
  };

  const handleDetectedCode = async (code: string) => {
    setScanResult(code);

    try {
      // Check if it's a room QR
      if (code.toUpperCase().includes('ROOM')) {
        const room = await ApiService.getRoomByQr(code);
        if (room) {
          navigate(`/rooms/${room.id}`);
          return;
        }
      }

      // Check if it's a device QR
      if (code.toUpperCase().includes('DEV') || code.toUpperCase().includes('MIC') || code.toUpperCase().includes('PRJ')) {
        const dev = await ApiService.getDeviceByQr(code);
        if (dev) {
          navigate(`/devices/${dev.id}`);
          return;
        }
      }

      setErrorMsg(`Mã QR "${code}" không khớp với phòng học hoặc thiết bị nào trong cơ sở dữ liệu.`);
    } catch (err) {
      setErrorMsg('Lỗi khi tra cứu mã QR từ máy chủ.');
    }
  };

  // Sample quick test buttons for demo
  const sampleQRCodes = [
    { label: 'Phòng A.301 (Bàn GV)', code: 'QR-ROOM-A301', type: 'room', desc: 'Có mic Sisu xanh, máy chiếu, loa' },
    { label: 'Bộ Mic Sisu Màu Xanh A.301', code: 'QR-DEV-MIC-A301-01', type: 'device', desc: 'Xem cách chỉnh tần số UHF và xử lý hú' },
    { label: 'Phòng A.302 (Đang Báo Hỏng)', code: 'QR-ROOM-A302', type: 'room', desc: 'Có 1 mic đang chờ sửa chữa' },
    { label: 'Máy chiếu Panasonic A.301', code: 'QR-DEV-PRJ-A301-01', type: 'device', desc: 'Xem cách cắm HDMI và chỉnh nét Focus' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 md:pb-12">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-sm">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Quét Mã QR Tra Cứu Nhanh</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Quét tem QR dán trên bàn giảng viên hoặc thân thiết bị để xem hướng dẫn sử dụng và gửi báo hỏng 1-chạm.
        </p>
      </div>

      {/* Scanner Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div
          id="reader"
          className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-slate-900 min-h-[260px] flex items-center justify-center text-white text-xs border border-slate-700"
        >
          {!isScanning && (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-10 h-10 text-slate-400 mx-auto animate-bounce" />
              <p className="text-slate-300">Nhấn nút bên dưới để mở Camera quét trực tiếp</p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Bật Camera Quét QR</span>
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-all"
            >
              <span>Dừng Camera</span>
            </button>
          )}

          <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Tải ảnh QR từ máy</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Demo Test Simulation (Rất tiện cho việc chấm bài đồ án) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Thử nghiệm nhanh (Demo Simulation)</h2>
        </div>
        <p className="text-xs text-slate-300">
          Nếu chưa in tem QR ra giấy, bạn có thể bấm trực tiếp các mẫu tem dán thực tế dưới đây để kiểm tra hệ thống điều hướng:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {sampleQRCodes.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleDetectedCode(item.code)}
              className="text-left p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {item.type === 'room' ? (
                    <Building2 className="w-4 h-4 text-sky-400" />
                  ) : (
                    <Mic className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="font-bold text-sm text-white group-hover:text-sky-300">{item.label}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">{item.code}</p>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

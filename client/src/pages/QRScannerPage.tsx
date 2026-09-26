import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Camera, 
  Upload, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  AlertCircle,
  ClipboardList,
  BookOpen
} from 'lucide-react';
import { ApiService } from '../services/api';

export const QRScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandlingCodeRef = useRef(false);

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
          // Camera có thể nhận cùng một mã ở nhiều khung hình liên tiếp.
          // Chỉ xử lý lần đầu và tắt camera xong mới chuyển sang trang phòng.
          if (isHandlingCodeRef.current) return;
          isHandlingCodeRef.current = true;
          void (async () => {
            await stopScanner();
            try {
              await handleDetectedCode(decodedText);
            } finally {
              isHandlingCodeRef.current = false;
            }
          })();
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
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) {
      setIsScanning(false);
      return;
    }

    try {
      await scanner.stop();
      scanner.clear();
    } catch (err) {
      // Nếu camera chưa kịp chạy hoàn toàn thì vẫn phải trả giao diện về trạng thái tắt.
      console.error('Error stopping scanner:', err);
    } finally {
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
    const normalizedCode = code.trim();
    setScanResult(normalizedCode);

    try {
      // QR của phòng là luồng chính. Không phụ thuộc vào cách đặt tên mã QR,
      // nên admin có thể thay đổi mã trong SQL mà vẫn quét được.
      try {
        const room = await ApiService.getRoomByQr(normalizedCode);
        if (room) {
          navigate(`/rooms/${room.id}?from=qr`);
          return;
        }
      } catch {
        // Không phải mã phòng: tiếp tục hỗ trợ tem QR thiết bị đã in trước đó.
      }

      try {
        const dev = await ApiService.getDeviceByQr(normalizedCode);
        if (dev) {
          navigate(`/devices/${dev.id}?from=qr`);
          return;
        }
      } catch {
        // Hiển thị một thông báo chung, dễ hiểu bên dưới.
      }

      setErrorMsg(`Mã QR "${normalizedCode}" không khớp với phòng hoặc thiết bị nào trong cơ sở dữ liệu.`);
    } catch (err) {
      setErrorMsg('Lỗi khi tra cứu mã QR từ máy chủ.');
    }
  };

  // Mẫu QR phòng để kiểm tra nhanh khi chưa in tem QR.
  const sampleQRCodes = [
    { label: 'Phòng A.301', code: 'QR-ROOM-A301', desc: 'Xem số lượng và danh sách thiết bị trong phòng' },
    { label: 'Phòng A.302', code: 'QR-ROOM-A302', desc: 'Chọn thiết bị để xem hướng dẫn hoặc báo hỏng' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 md:pb-12">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-sm">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Quét Mã QR Tra Cứu Nhanh</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Quét mã QR của phòng để xem thông tin phòng, danh sách thiết bị và báo hỏng đúng thiết bị.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Building2, text: 'Thông tin phòng', detail: 'Tòa, tầng và trạng thái phòng' },
          { icon: ClipboardList, text: 'Danh sách thiết bị', detail: 'Số lượng và thiết bị đang có' },
          { icon: BookOpen, text: 'Hướng dẫn & báo hỏng', detail: 'Chọn từng thiết bị để thực hiện' }
        ].map(({ icon: Icon, text, detail }) => (
          <div key={text} className="bg-sky-50/70 rounded-2xl border border-sky-100 p-4 flex items-start gap-3">
            <Icon className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-800">{text}</p>
              <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 shrink-0">
          <QRCodeSVG value="QR-ROOM-A1-101" size={128} bgColor="#f8fafc" fgColor="#075985" level="H" />
        </div>
        <div className="text-center sm:text-left space-y-2">
          <p className="text-sm font-extrabold text-slate-900">QR phòng thử nghiệm: A1-101</p>
          <p className="text-xs text-slate-500 max-w-md">
            Sau khi chạy dữ liệu mẫu, hãy dùng điện thoại quét mã này hoặc chụp màn hình rồi chọn “Tải ảnh QR từ máy”.
          </p>
          <code className="inline-block px-2 py-1 rounded bg-slate-100 text-xs font-bold text-sky-800">QR-ROOM-A1-101</code>
        </div>
      </div>

      {/* Scanner Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
               <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-slate-900 min-h-[260px] border border-slate-700">
          <div id="reader" className="w-full min-h-[260px]" />

          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-xs pointer-events-none">
              <div className="text-center p-6 space-y-3">
                <Camera className="w-10 h-10 text-slate-400 mx-auto animate-bounce" />
                <p className="text-slate-300">Nhấn nút bên dưới để mở Camera quét trực tiếp</p>
              </div>
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
          Nếu chưa in tem QR ra giấy, bạn có thể bấm mẫu QR phòng dưới đây để kiểm tra luồng xem thiết bị:
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
                  <Building2 className="w-4 h-4 text-sky-400" />
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

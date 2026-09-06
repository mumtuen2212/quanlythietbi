import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Mic, 
  Tv, 
  Volume2, 
  Wind, 
  ArrowRight, 
  Sparkles,
  HelpCircle,
  FileText
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Manual, DeviceCategory } from '../types';

export const ManualsListPage: React.FC = () => {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [manualsData, catData] = await Promise.all([
        ApiService.getManuals(),
        ApiService.getCategories()
      ]);
      setManuals(manualsData);
      setCategories(catData);
    } catch (err) {
      console.error('Error loading manuals:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredManuals = manuals.filter(m => {
    const matchesCategory = selectedCatId ? m.category_id === selectedCatId : true;
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-20 md:pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-sky-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Cẩm nang Kỹ thuật & Hướng dẫn Giảng viên</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
          Hướng Dẫn Sử Dụng Thiết Bị Phòng Học
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
          Tra cứu nhanh cách kết nối và vận hành micro không dây Sisu xanh, máy chiếu, âm thanh, điều hòa và mẹo xử lý các lỗi thường gặp trong 30 giây trước khi bắt đầu tiết học.
        </p>

        {/* Search */}
        <div className="pt-2 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm hướng dẫn (vd: mic sisu xanh, kết nối máy chiếu...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 backdrop-blur"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCatId(null)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            selectedCatId === null
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Tất cả danh mục ({manuals.length})
        </button>

        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCatId === cat.id
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.category_name}
          </button>
        ))}
      </div>

      {/* Manuals Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Đang tải danh sách tài liệu...</div>
      ) : filteredManuals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          Không tìm thấy hướng dẫn nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredManuals.map(manual => {
            const isSisu = manual.title.toLowerCase().includes('sisu') || manual.title.toLowerCase().includes('micro');
            return (
              <div
                key={manual.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {isSisu ? <Mic className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                    </div>

                    {isSisu && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                        ⭐ Dùng nhiều nhất
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                      {manual.title}
                    </h2>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {manual.summary}
                    </p>
                  </div>

                  {/* FAQ count chip */}
                  {manual.quick_faq && manual.quick_faq.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Bao gồm {manual.quick_faq.length} hướng dẫn xử lý lỗi nhanh</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Cập nhật: {manual.created_at}</span>
                  <Link
                    to={`/devices/${manual.device_id || 1}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 group-hover:translate-x-1 transition-all"
                  >
                    <span>Xem hướng dẫn chi tiết</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

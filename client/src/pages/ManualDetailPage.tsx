import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ApiService } from '../services/api';
import { Manual } from '../types';

export const ManualDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [manual, setManual] = useState<Manual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setManual(null);
    void ApiService.getManualById(Number(id)).then(data => {
      if (!cancelled) setManual(data);
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Link to="/manuals" className="inline-flex items-center gap-2 text-sky-700 font-semibold text-sm"><ArrowLeft className="w-4 h-4" />Quay lại hướng dẫn</Link>
      {loading ? <p className="py-12 text-center text-slate-500">Đang tải hướng dẫn...</p> : !manual ? <p className="py-12 text-center text-slate-500">Không tìm thấy hướng dẫn.</p> : (
        <article className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-3">
            <BookOpen className="w-8 h-8 text-sky-600" />
            <h1 className="text-2xl font-extrabold text-slate-900">{manual.title}</h1>
            {manual.device_id === null && <p className="text-sm text-sky-800 rounded-xl bg-sky-50 p-3">Hướng dẫn dùng chung cho {manual.category_name || 'thiết bị cùng loại'}{manual.applicable_model ? ` · ${manual.applicable_model}` : ''} ở mọi phòng.</p>}
          </div>
          <div className="prose prose-slate max-w-none"><ReactMarkdown>{manual.content_markdown}</ReactMarkdown></div>
          {manual.quick_faq?.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Xử lý lỗi thường gặp</h2>
              {manual.quick_faq.map((faq, index) => <div key={index} className="bg-slate-50 rounded-xl p-4"><h3 className="font-semibold">{faq.problem}</h3><p className="text-sm text-slate-600 mt-2">{faq.solution}</p></div>)}
            </div>
          )}
        </article>
      )}
    </div>
  );
};

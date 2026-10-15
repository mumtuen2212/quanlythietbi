import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { createSearchDocument, normalizeSearch, scoreSearchDocument, type SearchSuggestion } from '../services/search';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchSuggestion[];
  placeholder: string;
  className?: string;
  disabled?: boolean;
  onSelect?: (suggestion: SearchSuggestion) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, suggestions, placeholder, className, disabled, onSelect }) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const indexed = useMemo(() => suggestions.map(item => ({ item, document: createSearchDocument([item.label, item.value, item.detail, ...(item.keywords ?? [])]) })), [suggestions]);
  const results = useMemo(() => {
    if (!normalizeSearch(value)) return [];
    return indexed.map(({ item, document }, order) => ({ item, order, score: scoreSearchDocument(document, value) }))
      .filter(result => result.score > 0).sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, 6).map(result => result.item);
  }, [indexed, value]);
  const visible = open && !disabled && Boolean(normalizeSearch(value));
  const activeIndex = active < results.length ? active : -1;

  useEffect(() => { setActive(-1); }, [value]);
  useEffect(() => {
    if (!visible) { setPosition(null); return; }
    const reposition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const bottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const width = Math.min(rect.width, viewportWidth - 16);
      const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
      const below = bottom - rect.bottom - 12;
      const above = rect.top - viewportTop - 12;
      const upwards = below < 160 && above > below;
      setPosition({ position: 'fixed', left, width, maxHeight: Math.max(0, Math.min(280, upwards ? above : below)),
        ...(upwards ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    };
    const outside = (event: PointerEvent) => {
      if (!inputRef.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setOpen(false);
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
      document.removeEventListener('pointerdown', outside);
    };
  }, [visible]);
  useEffect(() => {
    if (visible && activeIndex >= 0) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, id, visible]);

  const select = (item: SearchSuggestion) => {
    onChange(item.value);
    onSelect?.(item);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  return <>
    <input ref={inputRef} type="text" value={value} disabled={disabled} placeholder={placeholder} aria-label={placeholder}
      className={className} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={visible}
      aria-controls={visible ? `${id}-list` : undefined}
      aria-activedescendant={visible && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onFocus={() => setOpen(true)}
      onBlur={event => { if (!popupRef.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
          event.preventDefault(); setOpen(true);
          setActive(previous => event.key === 'ArrowDown' ? (previous + 1) % results.length : (previous <= 0 ? results.length - 1 : previous - 1));
        } else if (event.key === 'Enter' && visible && activeIndex >= 0) {
          event.preventDefault(); select(results[activeIndex]);
        } else if (event.key === 'Tab') setOpen(false);
      }} />
    {visible && position && createPortal(<div ref={popupRef} style={position}
      className="z-[3000] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl [overflow-wrap:anywhere]">
      <p className="px-3 py-2 text-[11px] font-semibold text-slate-500">Gợi ý phù hợp · có thể tìm không dấu</p>
      <div id={`${id}-list`} role="listbox" aria-label={`Gợi ý ${placeholder}`}>
        {results.map((item, index) => <div key={item.id} id={`${id}-option-${index}`} role="option" aria-selected={activeIndex === index}
          onMouseDown={event => event.preventDefault()} onClick={() => select(item)}
          onMouseEnter={() => setActive(index)}
          className={`flex min-h-11 cursor-pointer items-start gap-2 px-3 py-2.5 text-left text-sm ${activeIndex === index ? 'bg-sky-50 text-sky-800' : 'hover:bg-slate-50'}`}>
          <Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <div className="min-w-0"><p className="font-semibold">{item.label}</p>{item.detail && <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>}</div>
        </div>)}
      </div>
      {results.length === 0 && <p role="status" className="px-3 pb-3 text-xs text-slate-500">Không có gợi ý phù hợp. Thử từ ngắn hơn hoặc mã/tên khác.</p>}
    </div>, document.body)}
  </>;
};

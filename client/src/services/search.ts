// Shared by filtering and autocomplete so a suggested item is also a search result.
export const normalizeSearch = (value: unknown): string => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface SearchDocument {
  text: string;
  compactFields: string[];
  words: string[];
}

export const createSearchDocument = (fields: readonly unknown[]): SearchDocument => {
  const normalized = fields.map(normalizeSearch).filter(Boolean);
  const text = normalized.join(' ');
  return { text, compactFields: normalized.map(field => field.replace(/ /g, '')), words: [...new Set(text.split(' '))] };
};

// Bound the work and do not fuzzy-match identifiers containing digits.
const isCloseWord = (left: string, right: string): boolean => {
  if (left.length < 4 || /\d/.test(left + right)) return false;
  const limit = left.length >= 8 ? 2 : 1;
  if (Math.abs(left.length - right.length) > limit || right.length > 64 || left.length > 64) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let beforePrevious = previous;
  for (let row = 1; row <= left.length; row++) {
    const current = [row];
    for (let col = 1; col <= right.length; col++) {
      current[col] = Math.min(current[col - 1] + 1, previous[col] + 1, previous[col - 1] + (left[row - 1] === right[col - 1] ? 0 : 1));
      if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
        current[col] = Math.min(current[col], beforePrevious[col - 2] + 1);
      }
    }
    if (Math.min(...current) > limit) return false;
    beforePrevious = previous;
    previous = current;
  }
  return previous[right.length] <= limit;
};

/** Exact/accent-insensitive matches rank above small spelling mistakes. Zero means no match. */
export const scoreSearchDocument = (document: SearchDocument, query: string): number => {
  const term = normalizeSearch(query);
  if (!term) return 1;
  if (document.text === term) return 120;
  if (document.text.startsWith(term)) return 110;
  if (document.text.includes(term)) return 100;
  const compact = term.replace(/ /g, '');
  if (compact && document.compactFields.some(field => field.includes(compact))) return 90;
  const tokens = term.split(' ');
  let fuzzy = false;
  for (const token of tokens) {
    if (document.words.some(word => word.includes(token))) continue;
    if (!document.words.some(word => isCloseWord(token, word))) return 0;
    fuzzy = true;
  }
  return fuzzy ? 50 : 80;
};

export const matchesSearch = (fields: readonly unknown[], query: string): boolean =>
  !normalizeSearch(query) || scoreSearchDocument(createSearchDocument(fields), query) > 0;

export interface SearchSuggestion {
  id: string | number;
  label: string;
  value: string;
  detail?: string;
  keywords?: readonly unknown[];
}

export const rankSuggestions = (items: readonly SearchSuggestion[], query: string, limit = 6): SearchSuggestion[] => {
  if (!normalizeSearch(query)) return [];
  return items.map((item, order) => ({ item, order, score: scoreSearchDocument(createSearchDocument([item.label, item.value, item.detail, ...(item.keywords ?? [])]), query) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit).map(result => result.item);
};

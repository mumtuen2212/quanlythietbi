import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch, normalizeSearch, rankSuggestions } from '../src/services/search';

test('Vietnamese accents, Đ, case, and whitespace are normalized', () => {
  assert.equal(normalizeSearch('  GIẢNG đường  '), 'giang duong');
  assert.ok(matchesSearch(['Máy chiếu'], '  MAY CHIEU '));
  assert.ok(matchesSearch(['Điều hòa'], 'dieu hoa'));
});
test('partial words and several fields can be searched together', () => {
  assert.ok(matchesSearch(['Máy chiếu Epson', 'A1-102'], 'a1 may chi'));
  assert.ok(matchesSearch(['Micro Sisu xanh'], 'mic sis'));
});
test('small spelling errors and adjacent transpositions match', () => {
  assert.ok(matchesSearch(['Máy chiếu'], 'may chieuo'));
  assert.ok(matchesSearch(['Giảng đường'], 'giagn duong'));
  assert.ok(matchesSearch(['Máy chiếu'], 'may chie'));
});
test('identifiers ignore separators but do not guess different digits', () => {
  assert.ok(matchesSearch(['A1-102'], 'a1102'));
  assert.ok(matchesSearch(['QR-EQ-102'], 'qr eq 102'));
  assert.equal(matchesSearch(['A1-102'], 'a1103'), false);
  assert.equal(matchesSearch(['REPORT-007'], 'report008'), false);
});
test('short words are not fuzzy matched and unrelated queries stay empty', () => {
  assert.equal(matchesSearch(['Máy chiếu'], 'may bom'), false);
  assert.equal(matchesSearch(['Micro Sisu'], 'xxx'), false);
  assert.equal(matchesSearch(['Máy chiếu'], 'may zzzzz'), false);
  assert.ok(matchesSearch([undefined, null], ''));
  assert.equal(matchesSearch([undefined, null], 'may'), false);
});
test('suggestions rank exact matches ahead of typos and have a bounded size', () => {
  const options = [
    { id: 1, label: 'Máy chếu', value: 'MC-1' },
    { id: 2, label: 'Máy chiếu', value: 'MC-2' },
    { id: 3, label: 'Micro', value: 'MIC-3' },
  ];
  assert.deepEqual(rankSuggestions(options, 'may chieu').map(item => item.id), [2, 1]);
  assert.deepEqual(rankSuggestions(options, ''), []);
  assert.deepEqual(rankSuggestions(options, 'khong lien quan'), []);
  assert.equal(rankSuggestions(Array.from({ length: 20 }, (_, id) => ({ id, label: `Máy chiếu ${id}`, value: `${id}` })), 'may').length, 6);
});
test('all suggestion fields are searchable without modifying source data', () => {
  const options = [{ id: 1, label: 'Máy chiếu', value: 'MC-1', detail: 'A1-102', keywords: ['Epson'] }];
  const before = JSON.stringify(options);
  assert.equal(rankSuggestions(options, 'epsno')[0]?.id, 1);
  assert.equal(JSON.stringify(options), before);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsToText } from '../src/lib/ocrRows.ts';

test('同じ高さの品名と価格を 1 行にまとめる', () => {
  const text = rowsToText([
    { text: '¥258', left: 300, top: 101, height: 20 },
    { text: 'バナナ', left: 10, top: 130, height: 20 },
    { text: '牛乳', left: 10, top: 100, height: 20 },
    { text: '198', left: 305, top: 132, height: 20 },
  ]);
  assert.equal(text, '牛乳 ¥258\nバナナ 198');
});

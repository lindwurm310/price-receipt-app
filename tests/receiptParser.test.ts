import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, parseReceipt } from '../src/lib/receiptParser.ts';

const sample = `
スーパーさくら 青葉台店
横浜市青葉区青葉台1-2-3
TEL 045-123-4567
２０２６年１０月２０日(月) 18:42
レジ02 担当 山田
＊明治おいしい牛乳 ¥258
国産若鶏もも肉 498
 値引 -100
バナナ 198※
2個 X 単98
カップヌードル 196
小計 ¥1,150
外税 8% ¥92
合計 ¥1,242
お預り ¥2,000
お釣 ¥758
`;

test('レシートから店舗名・日付・品目・合計を取り出す', () => {
  const r = parseReceipt(sample);
  assert.equal(r.storeName, 'スーパーさくら 青葉台店');
  assert.equal(r.date, '2026-10-20');
  assert.equal(r.total, 1242);
  assert.deepEqual(r.items, [
    { name: '明治おいしい牛乳', price: 258, quantity: 1, discount: 0 },
    { name: '国産若鶏もも肉', price: 398, quantity: 1, discount: 100 },
    { name: 'バナナ', price: 198, quantity: 1, discount: 0 },
    { name: 'カップヌードル', price: 196, quantity: 2, discount: 0 },
  ]);
});

test('和暦の日付を読む', () => {
  assert.equal(parseDate('令和8年10月21日'), '2026-10-21');
  assert.equal(parseDate('R8.1.5 10:00'), '2026-01-05');
  assert.equal(parseDate('合計 ¥1,000'), null);
});

test('数量行が品目の後にある場合はその品目に付ける', () => {
  const r = parseReceipt('お茶 300\n 3コ X @100\nパン 150');
  assert.deepEqual(r.items.map((i) => [i.name, i.quantity]), [['お茶', 3], ['パン', 1]]);
});

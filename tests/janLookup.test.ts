import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanProductName, isValidJan } from '../src/lib/janLookup.ts';

test('JAN のチェックディジットを検証する', () => {
  assert.equal(isValidJan('4902102072618'), true);
  assert.equal(isValidJan('4902102072619'), false);
  assert.equal(isValidJan('49123456'), true);
  assert.equal(isValidJan('abc'), false);
});

test('ネットショップ向けの飾りを商品名から落とす', () => {
  assert.equal(cleanProductName('【送料無料】日清 カップヌードル 78g×20個'), '日清 カップヌードル 78g');
});

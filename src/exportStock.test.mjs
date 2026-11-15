// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { planExport } from './exportStock.js';
import { parseCsv, planImport } from './importStock.js';

const HEADER = 'Item name,Variations,Price,Tax rate (%),Quantity,Category,Track inventory? (Yes/No),Item id (Do not change)';
const product = (o) => ({ id: 1, name: 'Bueno', current: 0, price: 0, externalId: null, ...o });

test('writes stock and price, keeps every other cell', () => {
  const csv = `${HEADER}\r\nBueno,,0.80,5.5,3,Épicerie,Yes,abc\r\nCafé,,1.00,10,0,Boissons,No,def\r\n`;
  const out = planExport(csv, [product({ current: 12, price: 1, externalId: 'abc' })]);
  assert.equal(out.text, `${HEADER}\r\nBueno,,1.00,5.5,12,Épicerie,Yes,abc\r\nCafé,,1.00,10,0,Boissons,No,def\r\n`);
  assert.equal(out.updated, 1);
  assert.deepEqual(out.skipped, ['Café']);
  assert.deepEqual(out.missing, []);
});

test('matches by name when the product has no SumUp id, and lists products missing from the file', () => {
  const csv = `${HEADER}\nKitKat White,,0.80,5.5,1,Épicerie,Yes,x1\n`;
  const out = planExport(csv, [
    product({ id: 1, name: 'kitkat  white', current: 4, price: 1 }),
    product({ id: 2, name: 'Lion', current: 2 }),
  ]);
  assert.match(out.text, /^KitKat White,,1\.00,5\.5,4,/m);
  assert.deepEqual(out.missing, ['Lion']);
});

test('keeps comma decimals, quoting and the BOM', () => {
  const csv = `\uFEFF${HEADER}\n"Sandwich, jambon",,"2,60",5.5,1,Sandwich,Yes,s1\n`;
  const out = planExport(csv, [product({ name: 'Sandwich, jambon', current: 7, price: 3.3, externalId: 's1' })]);
  assert.equal(out.text, `\uFEFF${HEADER}\n"Sandwich, jambon",,"3,30",5.5,7,Sandwich,Yes,s1\n`);
});

test('leaves the price alone when the app has none', () => {
  const csv = `${HEADER}\nBueno,,0.80,5.5,3,Épicerie,Yes,abc\n`;
  const out = planExport(csv, [product({ current: 3, price: 0, externalId: 'abc' })]);
  assert.equal(out.text, csv);
  assert.equal(out.updated, 0);
});

test('the exported file imports back to the same stock and prices', () => {
  const csv = `${HEADER}\nBueno,,0.80,5.5,3,Épicerie,Yes,abc\n`;
  const inventory = [product({ current: 9, price: 1, externalId: 'abc' })];
  const plan = planImport(planExport(csv, inventory).text, inventory);
  assert.deepEqual(plan.updates.map((u) => [u.current, u.price]), [[9, 1]]);
});

test('rejects a file that is not a SumUp items export', () => {
  assert.throws(() => planExport('a,b\n1,2\n', []), /Not a SumUp items export/);
  assert.equal(parseCsv('').length, 0);
});

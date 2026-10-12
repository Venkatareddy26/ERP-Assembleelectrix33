import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { buildWorkbook, exportSheets } from '../server/export.mjs';
import { seedDemo, emptyState } from '../server/domain.mjs';

const bom = JSON.parse(readFileSync(new URL('../data/bom.json', import.meta.url), 'utf8'));
const state = seedDemo(bom);
const workspace = { mode: 'demo', bom, state };

test('Excel bills preserve dates, numeric charges, wide columns and frozen headings', async () => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await buildWorkbook(workspace, 'billing'));
  const sheet = book.worksheets[0];
  assert.equal(sheet.getCell('A6').value, state.invoices[0].number);
  assert.equal(sheet.getCell('C6').value.toISOString().slice(0, 10), state.invoices[0].date);
  assert.equal(sheet.getCell('C6').numFmt, 'dd mmm yyyy');
  assert.ok(sheet.getColumn('C').width >= 19);
  assert.equal(sheet.getCell('G6').value, state.invoices[0].amountPaise / 100);
  assert.equal(sheet.getCell('G6').numFmt, '#,##0.00');
  assert.equal(sheet.views[0].ySplit, 5);
  assert.match(sheet.getCell('A2').value, /DEMO RECORDS/);
  assert.equal(sheet.autoFilter, `A5:G${5 + state.invoices.length}`);
});

test('Customer exports include customers without rates, preserve IDs and treat formula-like text as text', async () => {
  const s = emptyState(); s.customers.push({ id: 'customer', name: '=1+1', contact: '+919999999999' });
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await buildWorkbook({ ...workspace, state: s }, 'customers'));
  assert.equal(book.worksheets.length, 2);
  assert.equal(book.worksheets[0].getCell('A6').value, '=1+1');
  assert.equal(book.worksheets[0].getCell('A6').type, ExcelJS.ValueType.String);
  assert.equal(book.worksheets[0].getCell('B6').value, '+919999999999');
  assert.equal(book.worksheets[1].getCell('A6').value, 'No records saved yet.');
});

test('All modules export and stock balances and earnings reconcile to saved records', async () => {
  const month = state.production[0].date.slice(0, 7);
  for (const section of ['bom', 'customers', 'inventory', 'orders', 'production', 'quality', 'dispatch', 'billing', 'workers']) {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await buildWorkbook(workspace, section, { month, productId: bom.products[0].id }));
    assert.ok(book.worksheets.length > 0, section);
  }
  const stock = exportSheets(workspace, 'inventory')[0].rows;
  for (const row of stock) assert.equal(row.Balance, row.Received - row.Consumed);
  const earnings = exportSheets(workspace, 'workers', { month })[0].rows;
  for (const w of state.workers) {
    const row = earnings.find(r => r.Worker === w.name);
    assert.equal(row['Piece earnings INR'], w.type === 'salary' ? 'Not applicable' : state.production.filter(p => p.workerId === w.id && p.date.startsWith(month)).reduce((n, p) => n + p.accepted * p.wageRatePaise, 0) / 100);
  }
  assert.throws(() => exportSheets(workspace, 'workers', { month: '2026-99' }), /valid earnings month/);
  assert.throws(() => exportSheets(workspace, 'bom', { productId: 'missing' }), /valid product/);
  assert.throws(() => exportSheets(workspace, '../bad'), /module/);
});

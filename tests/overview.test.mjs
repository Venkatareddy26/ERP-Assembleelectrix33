import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOverview, backupAge } from '../src/lib/overview.ts';
import { readPreferences, writePreferences, preferenceKey } from '../src/lib/workspace-preferences.ts';
import { emptyState, execute } from '../server/domain.mjs';

const now = new Date('2026-10-12T10:00:00+05:30');
const bom = { products: [{ id: 'P1', name: 'Assembly' }], materials: [{ id: 'M1', name: 'Contact', unit: 'pcs' }], lines: [{ productId: 'P1', materialId: 'M1', quantity: 2, sourceRow: 2 }] };
const workspace = state => ({ mode: 'actual', bom, state });
const order = (id, customerId, due = '2026-10-14') => ({ id, number: id, customerId, productId: 'P1', quantity: 10, ratePaise: 450, due });

test('empty actual records produce no invented alerts, activity, quantities or backup history', () => {
  const s = emptyState(), before = JSON.stringify(s);
  const m = buildOverview(workspace(s), now);
  assert.equal(m.date, '2026-10-12');
  assert.equal(m.dueOrders.length + m.shortages.length + m.activity.length, 0);
  assert.equal(m.producedToday + m.total.pending + m.unbilledPaise + m.ready, 0);
  assert.equal(backupAge(undefined, now), null);
  assert.equal(JSON.stringify(s), before);
});

test('due dates include overdue and next three days, excluding dispatched orders', () => {
  const s = emptyState();
  s.orders = [order('overdue', 'C1', '2026-10-11'), order('today', 'C1', '2026-10-12'), order('boundary', 'C1', '2026-10-15'), order('later', 'C1', '2026-10-16'), order('done', 'C1', '2026-10-10')];
  s.dispatches.push({ id: 'dispatch', orderId: 'done', quantity: 10 });
  const m = buildOverview(workspace(s), now);
  assert.deepEqual(m.dueOrders.map(o => o.id), ['overdue', 'today', 'boundary']);
  assert.equal(m.overdue.length, 1);
  assert.equal(m.status(s.orders[0]), 'Overdue');
});

test('material alerts aggregate remaining production and keep customer stock separate', () => {
  const s = emptyState();
  s.orders = [order('O1', 'C1'), order('O2', 'C1'), order('O3', 'C2')];
  s.customers = [{ id: 'C1', name: 'First' }, { id: 'C2', name: 'Second' }];
  s.inwards = [{ customerId: 'C1', materialId: 'M1', quantity: 10 }, { customerId: 'C2', materialId: 'M1', quantity: 100 }];
  s.production = [{ id: 'production', orderId: 'O1', quantity: 3, accepted: 2, rejected: 1, inspected: true, date: '2026-10-12', consumption: [{ materialId: 'M1', quantity: 6 }] }];
  const m = buildOverview(workspace(s), now);
  assert.equal(m.shortages.length, 1);
  assert.equal(m.shortages[0].customerId, 'C1');
  assert.equal(m.shortages[0].available, 4);
  assert.equal(m.shortages[0].required, 36); // 8 + 10 products remaining, 2 contacts each
  assert.equal(m.shortages[0].shortfall, 32);
});

test('QC age uses record time, rejects use inspection date, unbilled uses agreed rates', () => {
  const s = emptyState();
  s.orders = [order('O1', 'C1')];
  s.production = [
    { id: 'old', orderId: 'O1', quantity: 3, accepted: 0, rejected: 0, inspected: false, createdAt: '2026-10-11T09:59:59+05:30', date: '2026-10-11', consumption: [] },
    { id: 'boundary', orderId: 'O1', quantity: 2, accepted: 0, rejected: 0, inspected: false, createdAt: '2026-10-11T10:00:00+05:30', date: '2026-10-11', consumption: [] },
    { id: 'qc', orderId: 'O1', quantity: 5, accepted: 4, rejected: 1, inspected: true, inspectedAt: '2026-10-12T08:00:00+05:30', date: '2026-10-10', consumption: [] },
  ];
  s.dispatches = [{ orderId: 'O1', quantity: 4 }]; s.invoices = [{ orderId: 'O1', quantity: 1 }];
  const m = buildOverview(workspace(s), now);
  assert.equal(m.oldQcPieces, 3);
  assert.equal(m.total.pending, 5);
  assert.equal(m.rejectedToday, 1);
  assert.equal(m.producedToday, 0);
  assert.equal(m.unbilledPaise, 1350);
  assert.equal(m.ready, 0);
});

test('recent activity is the last eight operational entries and preserves missing actor truth', () => {
  const s = emptyState();
  s.audit = Array.from({ length: 20 }, (_, i) => ({ id: String(i), action: i % 3 ? ['production', 'inward', 'dispatch', 'invoice'][i % 4] : 'customer', recordId: String(i), createdAt: '2026-10-12T10:00:00+05:30' }));
  const m = buildOverview(workspace(s), now);
  assert.deepEqual(m.activity.map(a => a.id), ['19', '17', '16', '14', '13', '11', '10', '8']);
  assert.equal(m.activity[0].actor, undefined);
  const saved = execute(emptyState(), bom, 'customer', { name: 'Test customer', recordedBy: 'Operator one' });
  assert.equal(saved.state.audit[0].actor, 'Operator one');
});

test('backup and shift preferences remain isolated, tolerate invalid values and preserve other storage', () => {
  const map = new Map([['existing-data', 'keep']]);
  const storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) };
  writePreferences(storage, 'demo', { shift: 'Shift B', operator: 'Test', lastBackupAt: '2026-10-11T10:00:00+05:30' });
  assert.equal(readPreferences(storage, 'actual').shift, '');
  assert.equal(readPreferences(storage, 'demo').shift, 'Shift B');
  assert.equal(map.get('existing-data'), 'keep');
  assert.equal(backupAge(readPreferences(storage, 'demo').lastBackupAt, now), 1);
  assert.equal(backupAge('2026-10-12T00:00:00+05:30', now), 0);
  assert.equal(backupAge('2026-10-13T00:00:00+05:30', now), null);
  map.set(preferenceKey('actual'), 'invalid');
  assert.deepEqual(readPreferences(storage, 'actual'), { shift: '', operator: '' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IDBFactory } from 'fake-indexeddb';
import { createBrowserStore } from '../src/lib/browser-store.mjs';
import { loadErrorMessage } from '../server/backup.mjs';

const bom = JSON.parse(readFileSync(new URL('../data/bom.json', import.meta.url), 'utf8'));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

test('Browser records persist across clients and keep actual records separate from demo', async () => {
  const indexedDBFactory = new IDBFactory();
  const store = createBrowserStore({ bom, indexedDBFactory });
  const actual = await store.load('actual');
  assert.equal(actual.state.revision, 0);
  assert.equal(actual.state.customers.length, 0);
  const demo = await store.load('demo');
  assert.equal(demo.state.customers.length, 2);
  await store.save('actual', 'customer', { name: 'Persisted actual customer', recordedBy: 'Test operator' }, 0);
  const reloaded = await createBrowserStore({ bom, indexedDBFactory }).load('actual');
  assert.equal(reloaded.state.customers[0].name, 'Persisted actual customer');
  assert.equal(reloaded.state.audit[0].actor, 'Test operator');
  assert.equal((await store.load('demo')).state.revision, demo.state.revision);
  assert.deepEqual(reloaded.bom, bom);
});

test('Concurrent browser tabs cannot overwrite or double-bill the same saved revision', async () => {
  const indexedDBFactory = new IDBFactory();
  const first = createBrowserStore({ bom, indexedDBFactory });
  const second = createBrowserStore({ bom, indexedDBFactory });
  const { state } = await first.load('demo');
  const input = { orderId: state.orders[0].id, quantity: 500, date: today };
  const attempts = await Promise.allSettled([
    first.save('demo', 'invoice', input, state.revision),
    second.save('demo', 'invoice', input, state.revision),
  ]);
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(attempts.find(r => r.status === 'rejected').reason.message, /Records changed/);
  const saved = await second.load('demo');
  assert.equal(saved.state.invoices.length, state.invoices.length + 1);
  assert.equal(saved.state.revision, state.revision + 1);
  await assert.rejects(first.save('demo', 'invoice', input, saved.state.revision), /remain unbilled/);
  assert.equal((await first.load('demo')).state.revision, saved.state.revision);
});

test('Browser transaction failures keep stock, inspection and wage snapshots unchanged', async () => {
  const store = createBrowserStore({ bom, indexedDBFactory: new IDBFactory() });
  let { state } = await store.load('demo');
  await assert.rejects(store.save('demo', 'production', {
    orderId: state.orders[0].id, workerId: state.workers[0].id, quantity: 100000, date: today,
  }, state.revision), /remain to produce/);
  assert.deepEqual((await store.load('demo')).state, state);
  const production = await store.save('demo', 'production', {
    orderId: state.orders[0].id, workerId: state.workers[0].id, quantity: 10, date: today,
  }, state.revision);
  const entry = production.record;
  assert.equal(entry.wageRatePaise, state.workers[0].ratePaise);
  assert.ok(entry.consumption.length > 0);
  state = production.state;
  await assert.rejects(store.save('demo', 'qc', { productionId: entry.id, accepted: 9, rejected: 0 }, state.revision), /must equal/);
  assert.deepEqual((await store.load('demo')).state, state);
  const inspected = await store.save('demo', 'qc', { productionId: entry.id, accepted: 9, rejected: 1, note: 'Test reject' }, state.revision);
  assert.equal(inspected.record.accepted, 9);
  assert.equal(inspected.record.rejected, 1);
  assert.equal(inspected.record.wageRatePaise, entry.wageRatePaise);
});

test('Damaged browser records and blocked storage are reported without replacing saved data', async () => {
  const indexedDBFactory = new IDBFactory();
  const store = createBrowserStore({ bom, indexedDBFactory });
  await store.load('actual');
  const damaged = { schemaVersion: 1, state: { revision: 7, customers: 'damaged' } };
  const db = await new Promise((resolve, reject) => {
    const request = indexedDBFactory.open('assemble-electrix-records', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('workspaces', 'readwrite');
    tx.objectStore('workspaces').put(damaged, 'actual');
    tx.oncomplete = resolve;
    tx.onabort = reject;
  });
  await assert.rejects(store.load('actual'), { message: loadErrorMessage });
  await assert.rejects(store.save('actual', 'customer', { name: 'No replacement' }, 7), { message: loadErrorMessage });
  const preserved = await new Promise(resolve => {
    const request = db.transaction('workspaces').objectStore('workspaces').get('actual');
    request.onsuccess = () => resolve(request.result);
  });
  assert.deepEqual(preserved, damaged);
  const backup = { ...(await createBrowserStore({ bom, indexedDBFactory: new IDBFactory() }).load('actual')), schemaVersion: 1, exportedAt: new Date().toISOString() };
  const recovered = await store.restore('actual', backup, null);
  assert.equal(recovered.state.customers.length, 0);
  assert.equal(recovered.state.revision, 8);
  assert.deepEqual((await store.load('actual')).state, recovered.state);
  db.close();
  await assert.rejects(createBrowserStore({ bom, indexedDBFactory: null }).load('actual'), /storage is unavailable/);
});

test('Browser backup restore keeps snapshots, isolates workspaces, and invalidates stale forms', async () => {
  const indexedDBFactory = new IDBFactory();
  const store = createBrowserStore({ bom, indexedDBFactory });
  const second = createBrowserStore({ bom, indexedDBFactory });
  const demo = await store.load('demo');
  const actual = await store.load('actual');
  const backup = { ...demo, schemaVersion: 1, exportedAt: new Date().toISOString() };
  const saved = await store.save('demo', 'customer', { name: 'Added after backup' }, demo.state.revision);
  const restored = await second.restore('demo', backup, saved.state.revision);
  assert.deepEqual({ ...restored.state, revision: demo.state.revision }, demo.state);
  assert.equal(restored.state.revision, saved.state.revision + 1);
  assert.deepEqual((await store.load('actual')).state, actual.state);
  assert.deepEqual((await store.load('demo')).state, restored.state);
  await assert.rejects(store.save('demo', 'customer', { name: 'Stale form' }, saved.state.revision), /Records changed/);
  await assert.rejects(async () => store.restore('actual', backup, actual.state.revision), /Switch to that workspace/);
  await assert.rejects(store.restore('demo', backup, saved.state.revision), /Records changed after/);
  await assert.rejects(store.restore('demo', backup, null), /Records changed after/);
  assert.deepEqual((await store.load('demo')).state, restored.state);
});

test('Only one concurrent browser restore can replace the confirmed revision', async () => {
  const indexedDBFactory = new IDBFactory();
  const first = createBrowserStore({ bom, indexedDBFactory });
  const second = createBrowserStore({ bom, indexedDBFactory });
  const workspace = await first.load('demo');
  const backup = { ...workspace, schemaVersion: 1, exportedAt: new Date().toISOString() };
  const attempts = await Promise.allSettled([
    first.restore('demo', backup, workspace.state.revision),
    second.restore('demo', backup, workspace.state.revision),
  ]);
  assert.equal(attempts.filter(row => row.status === 'fulfilled').length, 1);
  assert.match(attempts.find(row => row.status === 'rejected').reason.message, /Records changed after/);
  assert.equal((await first.load('demo')).state.revision, workspace.state.revision + 1);
});

test('An invalid backup never changes browser records', async () => {
  const store = createBrowserStore({ bom, indexedDBFactory: new IDBFactory() });
  const workspace = await store.load('demo');
  const backup = { ...structuredClone(workspace), schemaVersion: 1, exportedAt: new Date().toISOString() };
  backup.state.production[0].accepted += 1;
  await assert.rejects(async () => store.restore('demo', backup, workspace.state.revision), /incomplete or damaged/);
  assert.deepEqual((await store.load('demo')).state, workspace.state);
});

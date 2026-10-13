export const recordCollections = ['customers', 'rates', 'workers', 'inwards', 'orders', 'production', 'dispatches', 'invoices', 'audit'];
export const loadErrorMessage = "Couldn't read saved records in this browser. Try again or restore a backup.";
export const staleRestoreMessage = 'Records changed after the backup was selected. Refresh, then select the backup again.';
const invalid = () => { throw new Error('This backup is incomplete or damaged. Saved records were not changed.'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = (value, empty = false) => typeof value === 'string' && (empty || value.trim().length > 0) && value.length <= 250;
const integer = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const quantity = value => integer(value, 1, 10000000);
const money = value => integer(value, 1, 100000000);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const timestamp = value => typeof value === 'string' && value.length <= 80 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const canonical = value => JSON.stringify(value, (_, item) => object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const requireValid = condition => { if (!condition) invalid(); };

// Only complete snapshots produced by Backup are accepted. Validate every record,
// reference and ledger balance before any saved workspace can be replaced.
export function validateBackup(backup, mode, bom) {
  requireValid(object(backup));
  if (backup.schemaVersion !== 1) throw new Error('This backup version is not supported. Saved records were not changed.');
  if (!['demo', 'actual'].includes(mode) || !['demo', 'actual'].includes(backup.mode)) invalid();
  if (backup.mode !== mode) throw new Error(`This backup contains ${backup.mode === 'demo' ? 'demo' : 'actual'} records. Switch to that workspace before restoring it.`);
  if (canonical(backup.bom) !== canonical(bom)) throw new Error('This backup uses a different Products & BOM list. Saved records were not changed.');
  requireValid(timestamp(backup.exportedAt));
  const state = backup.state;
  requireValid(object(state) && integer(state.revision) && recordCollections.every(key => Array.isArray(state[key])));
  const ids = {};
  for (const key of recordCollections) {
    ids[key] = new Set();
    for (const row of state[key]) {
      requireValid(object(row) && string(row.id) && !ids[key].has(row.id) && (row.createdAt === undefined || timestamp(row.createdAt)));
      ids[key].add(row.id);
    }
  }
  const products = new Set(bom.products.map(row => row.id));
  const materials = new Set(bom.materials.map(row => row.id));
  const seen = new Set();
  const unique = value => { requireValid(!seen.has(value)); seen.add(value); };
  for (const row of state.customers) {
    requireValid(string(row.name) && string(row.contact, true));
    unique(`customer:${row.name.toLowerCase()}`);
  }
  for (const row of state.rates) {
    requireValid(ids.customers.has(row.customerId) && products.has(row.productId) && money(row.ratePaise));
    unique(`rate:${row.customerId}:${row.productId}`);
  }
  for (const row of state.workers) requireValid(string(row.name) && ['piece', 'salary'].includes(row.type) && money(row.ratePaise));
  for (const row of state.inwards) {
    requireValid(ids.customers.has(row.customerId) && materials.has(row.materialId) && quantity(row.quantity) && string(row.challan) && date(row.date));
    unique(`inward:${row.customerId}:${row.materialId}:${row.challan}`);
  }
  const orders = new Map();
  for (const row of state.orders) {
    requireValid(string(row.number) && ids.customers.has(row.customerId) && products.has(row.productId) && quantity(row.quantity) && money(row.ratePaise) && date(row.due));
    unique(`order:${row.number}`);
    orders.set(row.id, row);
  }
  const balances = new Map();
  const balance = (customerId, materialId) => `${customerId}:${materialId}`;
  for (const row of state.inwards) {
    const key = balance(row.customerId, row.materialId);
    balances.set(key, (balances.get(key) ?? 0) + row.quantity);
  }
  const totals = new Map(state.orders.map(row => [row.id, { accepted: 0, pending: 0, dispatched: 0, billed: 0 }]));
  for (const row of state.production) {
    requireValid(ids.orders.has(row.orderId) && ids.workers.has(row.workerId) && quantity(row.quantity) && integer(row.accepted, 0, 10000000) && integer(row.rejected, 0, 10000000) && typeof row.inspected === 'boolean' && integer(row.wageRatePaise, 0, 100000000) && date(row.date));
    requireValid((row.note === undefined || string(row.note, true)) && (row.inspectedAt === undefined || timestamp(row.inspectedAt)));
    requireValid(row.inspected ? row.accepted + row.rejected === row.quantity && (row.rejected === 0 || string(row.note)) : row.accepted === 0 && row.rejected === 0);
    const order = orders.get(row.orderId);
    const lines = bom.lines.filter(line => line.productId === order.productId);
    requireValid(Array.isArray(row.consumption) && row.consumption.length === lines.length && lines.length > 0);
    const remainingLines = new Map(lines.map(line => [line.materialId, line.quantity * row.quantity]));
    for (const item of row.consumption) {
      requireValid(object(item) && materials.has(item.materialId) && remainingLines.has(item.materialId) && Number.isFinite(item.quantity) && item.quantity >= 0);
      const expected = remainingLines.get(item.materialId);
      requireValid(Math.abs(item.quantity - expected) <= Math.max(1, expected) * 1e-10);
      remainingLines.delete(item.materialId);
      const key = balance(order.customerId, item.materialId);
      balances.set(key, (balances.get(key) ?? 0) - item.quantity);
    }
    totals.get(row.orderId).accepted += row.accepted;
    if (!row.inspected) totals.get(row.orderId).pending += row.quantity;
  }
  for (const row of state.dispatches) {
    requireValid(string(row.number) && ids.orders.has(row.orderId) && quantity(row.quantity) && string(row.challan) && date(row.date));
    unique(`dispatch:${row.number}`);
    unique(`challan:${row.challan}`);
    totals.get(row.orderId).dispatched += row.quantity;
  }
  for (const row of state.invoices) {
    requireValid(string(row.number) && ids.orders.has(row.orderId) && quantity(row.quantity) && money(row.ratePaise) && integer(row.amountPaise, 1) && row.amountPaise === row.quantity * row.ratePaise && row.ratePaise === orders.get(row.orderId).ratePaise && date(row.date));
    unique(`invoice:${row.number}`);
    totals.get(row.orderId).billed += row.quantity;
  }
  for (const row of state.audit) requireValid(['customer', 'rate', 'worker', 'inward', 'order', 'production', 'qc', 'dispatch', 'invoice'].includes(row.action) && string(row.recordId) && timestamp(row.createdAt) && (row.actor === undefined || string(row.actor, true)));
  for (const [orderId, total] of totals) requireValid(total.accepted + total.pending <= orders.get(orderId).quantity && total.dispatched <= total.accepted && total.billed <= total.dispatched);
  for (const value of balances.values()) requireValid(Number.isFinite(value) && value >= -1e-7);
  return structuredClone(backup);
}

export function parseBackup(text, mode, bom) {
  let backup;
  try { backup = JSON.parse(text); } catch { invalid(); }
  return validateBackup(backup, mode, bom);
}

export function isReadableState(state) {
  return object(state) && integer(state.revision) && recordCollections.every(key => Array.isArray(state[key]));
}

// A restore moves the revision forward so a form open in another tab cannot
// accidentally save against the restored records using an older revision.
export function restoredState(backup, currentState, expectedRevision) {
  const readable = isReadableState(currentState);
  if (readable ? expectedRevision !== currentState.revision : expectedRevision !== null) throw new Error(staleRestoreMessage);
  // A completely unreadable payload has lost its revision as well. Reserve a
  // fresh revision above the historical counter rather than restarting at a
  // small backup revision that an old form may still hold.
  const currentRevision = integer(currentState?.revision) ? currentState.revision : Date.now();
  const revision = Math.max(currentRevision, backup.state.revision) + 1;
  if (!integer(revision)) throw new Error('The backup revision is too large to restore safely. Saved records were not changed.');
  return { ...structuredClone(backup.state), revision };
}

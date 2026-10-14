import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBackup, restoredState, validateBackup } from '../server/backup.mjs';
import { seedDemo } from '../server/domain.mjs';

const bom = JSON.parse(readFileSync(new URL('../data/bom.json', import.meta.url), 'utf8'));
const fixture = () => ({ mode: 'demo', bom, state: seedDemo(bom), schemaVersion: 1, exportedAt: '2026-10-13T10:30:00.000Z' });

test('The downloaded JSON backup round trips all immutable workflow snapshots', () => {
  const backup = fixture();
  const parsed = parseBackup(JSON.stringify(backup), 'demo', bom);
  assert.deepEqual(parsed, backup);
  const restored = restoredState(parsed, { ...backup.state, revision: backup.state.revision + 4 }, backup.state.revision + 4);
  assert.deepEqual(restored, { ...backup.state, revision: backup.state.revision + 5 });
  restored.production[0].accepted = 0;
  assert.notEqual(parsed.state.production[0].accepted, 0);
});

test('Backup validation rejects partial records, impossible ledgers and incompatible formats', () => {
  assert.throws(() => parseBackup('unfinished JSON', 'demo', bom), /incomplete or damaged/);
  const corruptions = [
    backup => { backup.state.workers = undefined; },
    backup => { backup.state.customers[0].name = 12; },
    backup => { backup.state.production[0].workerId = 'unknown'; },
    backup => { backup.state.production[0].accepted += 1; },
    backup => { backup.state.production[0].consumption[0].quantity += 1; },
    backup => { backup.state.dispatches[0].quantity = backup.state.orders[0].quantity + 1; },
    backup => { backup.state.invoices[0].amountPaise += 1; },
    backup => { backup.state.production.push(structuredClone(backup.state.production[0])); },
    backup => { backup.state.inwards[0].date = '2026-02-30'; },
    backup => { backup.state.revision = -1; },
    backup => { backup.exportedAt = 'yesterday'; },
  ];
  for (const corrupt of corruptions) {
    const backup = fixture();
    corrupt(backup);
    assert.throws(() => validateBackup(backup, 'demo', bom), /incomplete or damaged/);
  }
  const wrongVersion = fixture();
  wrongVersion.schemaVersion = 99;
  assert.throws(() => validateBackup(wrongVersion, 'demo', bom), /version is not supported/);
  assert.throws(() => validateBackup(fixture(), 'actual', bom), /Switch to that workspace/);
  assert.throws(() => validateBackup(fixture(), 'demo', { ...bom, sha256: 'different' }), /different Products & BOM/);
});

test('Restore revisions cannot wrap or replace data that changed during confirmation', () => {
  const backup = fixture();
  assert.throws(() => restoredState(backup, backup.state, null), /Records changed after/);
  assert.throws(() => restoredState(backup, backup.state, backup.state.revision - 1), /Records changed after/);
  const recovered = restoredState(backup, { revision: 500, customers: 'damaged' }, null);
  assert.equal(recovered.revision, 501);
  assert.throws(() => restoredState({ ...backup, state: { ...backup.state, revision: Number.MAX_SAFE_INTEGER } }, undefined, null), /revision is too large/);
});

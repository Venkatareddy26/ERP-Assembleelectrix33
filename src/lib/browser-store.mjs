import { emptyState, execute, seedDemo } from '../../server/domain.mjs';
import { isReadableState, loadErrorMessage, restoredState, validateBackup } from '../../server/backup.mjs';

const unavailable = () => new Error('Browser storage is unavailable. Allow this site to save data, then try again.');
const storageError = error => error?.name === 'QuotaExceededError'
  ? new Error('Browser storage is full. This entry was not saved. Download a backup before freeing browser space.')
  : unavailable();

// IndexedDB transactions serialize writes across tabs. Never replace a damaged
// saved workspace with empty records or acknowledge a write before it commits.
export function createBrowserStore({ bom, indexedDBFactory = globalThis.indexedDB, databaseName = 'assemble-electrix-records' }) {
  let databasePromise;
  function openDatabase() {
    if (!indexedDBFactory) return Promise.reject(unavailable());
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDBFactory.open(databaseName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('workspaces');
        request.onerror = () => { databasePromise = undefined; reject(storageError(request.error)); };
        request.onblocked = () => { databasePromise = undefined; reject(new Error('Close other tabs for this site, then refresh to open saved records.')); };
        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => { database.close(); databasePromise = undefined; };
          resolve(database);
        };
      });
    }
    return databasePromise;
  }

  function readState(saved, mode) {
    if (saved === undefined) return mode === 'demo' ? seedDemo(bom) : emptyState();
    const state = saved?.state;
    if (saved?.schemaVersion !== 1 || !isReadableState(state)) {
      throw new Error(loadErrorMessage);
    }
    return state;
  }

  async function transaction(mode, change, recovery = false) {
    if (!['demo', 'actual'].includes(mode)) throw new Error('Choose a valid record workspace.');
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      let result, failure;
      const tx = database.transaction('workspaces', 'readwrite');
      const store = tx.objectStore('workspaces');
      const request = store.get(mode);
      request.onsuccess = () => {
        try {
          const state = recovery ? (request.result?.schemaVersion === 1 ? request.result.state : undefined) : readState(request.result, mode);
          result = change ? change(state) : { mode, bom, state };
          if (change || request.result === undefined) store.put({ schemaVersion: 1, state: result.state }, mode);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? storageError(tx.error));
    });
  }

  return {
    load: mode => transaction(mode),
    save: (mode, action, input, revision) => transaction(mode, state => {
      if (revision !== state.revision) throw new Error('Records changed in another window. Close this form, refresh, and try again.');
      return execute(state, bom, action, input);
    }),
    restore: (mode, backup, revision) => {
      const validated = validateBackup(backup, mode, bom);
      return transaction(mode, state => ({ mode, bom, state: restoredState(validated, state, revision) }), true);
    },
  };
}

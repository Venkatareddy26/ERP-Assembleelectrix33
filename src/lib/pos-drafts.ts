export type PosDraftLine = { itemId: string; quantity: string; rate: string; discount: string; tax: string };
export type PosDraft = { id: string; name: string; parkedAt: string; date: string; partyId: string; method: string; account: string; received: string; note: string; lines: PosDraftLine[] };
type DraftStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const posDraftKey = (mode: 'demo' | 'actual') => `assemble-electrix:${mode}:pos-drafts:v1`;
const short = (v: unknown, length: number) => typeof v === 'string' && v.length <= length;
function decimal(v: unknown, min: number, max: number, places: number) {
  return typeof v === 'string' && new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(v) && Number(v) >= min && Number(v) <= max;
}
export function validatePosDrafts(value: unknown): asserts value is PosDraft[] {
  if (!Array.isArray(value) || value.length > 20) throw new Error('Parked bills are invalid. Your current bill has been kept.');
  const ids = new Set<string>();
  for (const d of value) {
    if (!d || !short(d.id, 80) || !d.id || ids.has(d.id) || !short(d.name, 80) || !d.name.trim() || !short(d.parkedAt, 40) || !Number.isFinite(Date.parse(d.parkedAt)) || !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isFinite(Date.parse(d.date)) || new Date(d.date).toISOString().slice(0, 10) !== d.date || !short(d.partyId, 100) || !['cash','bank','upi','other'].includes(d.method) || !short(d.account,100) || !decimal(d.received,0,1e9,2) || !short(d.note,250) || !Array.isArray(d.lines) || !d.lines.length || d.lines.length > 100) throw new Error('Parked bill details are invalid. Correct the bill before parking.');
    ids.add(d.id);
    const items = new Set<string>();
    for (const line of d.lines) {
      if (!line || !short(line.itemId,100) || !line.itemId || items.has(line.itemId) || !decimal(line.quantity,.001,1e9,3) || !decimal(line.rate,0,1e9,2) || !decimal(line.discount,0,100,2) || !decimal(line.tax,0,100,2)) throw new Error('Parked bill lines are invalid. Check quantities, prices, discounts and tax.');
      items.add(line.itemId);
    }
  }
}
export function readPosDrafts(storage: Pick<Storage,'getItem'>, mode: 'demo'|'actual'): PosDraft[] {
  const raw = storage.getItem(posDraftKey(mode));
  if (!raw) return [];
  let envelope;
  try { envelope = JSON.parse(raw); } catch { throw new Error('Parked bills could not be read. Stored bills have been kept.'); }
  if (envelope?.version !== 1) throw new Error('Unsupported parked bills format. Stored bills have been kept.');
  validatePosDrafts(envelope.drafts);
  return envelope.drafts;
}
export function writePosDrafts(storage: DraftStorage, mode: 'demo'|'actual', before: PosDraft[], after: PosDraft[]) {
  validatePosDrafts(after);
  if (JSON.stringify(readPosDrafts(storage, mode)) !== JSON.stringify(before)) throw new Error('Parked bills changed in another tab. Refresh the list and try again.');
  storage.setItem(posDraftKey(mode), JSON.stringify({version:1,drafts:after}));
}

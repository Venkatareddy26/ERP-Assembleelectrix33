import type { Workspace, Order } from '../types';

export const indiaDate = (value: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export type OrderSummary = { produced: number; accepted: number; rejected: number; pending: number; dispatched: number; billed: number };
export type StockShortage = { customerId: string; materialId: string; customer: string; material: string; available: number; required: number; shortfall: number };

export function buildOverview(w: Workspace, now = new Date()) {
  const { state: s, bom } = w;
  const date = indiaDate(now), cutoff = addDays(date, 3);
  const ordersById = new Map(s.orders.map(o => [o.id, o]));
  const customers = new Map(s.customers.map(c => [c.id, c.name]));
  const products = new Map(bom.products.map(p => [p.id, p.name]));
  const materials = new Map(bom.materials.map(m => [m.id, m.name]));
  const orderTotals = new Map<string, OrderSummary>(s.orders.map(o => [o.id, { produced: 0, accepted: 0, rejected: 0, pending: 0, dispatched: 0, billed: 0 }]));
  const balances = new Map<string, number>();
  const key = (customerId: string, materialId: string) => `${customerId}:${materialId}`;
  for (const i of s.inwards) balances.set(key(i.customerId, i.materialId), (balances.get(key(i.customerId, i.materialId)) ?? 0) + i.quantity);
  let producedToday = 0, rejectedToday = 0, oldQcPieces = 0, oldQcEntries = 0;
  for (const p of s.production) {
    const totals = orderTotals.get(p.orderId);
    if (totals) { totals.produced += p.quantity; totals.accepted += p.accepted; totals.rejected += p.rejected; if (!p.inspected) totals.pending += p.quantity; }
    if (p.date === date) producedToday += p.quantity;
    if (p.inspected && (p.inspectedAt ? indiaDate(p.inspectedAt) : p.date) === date) rejectedToday += p.rejected;
    const recorded = p.createdAt ? Date.parse(p.createdAt) : Date.parse(`${p.date}T00:00:00+05:30`);
    if (!p.inspected && now.getTime() - recorded > 86400000) { oldQcPieces += p.quantity; oldQcEntries += 1; }
    const order = ordersById.get(p.orderId);
    if (order) for (const c of p.consumption) balances.set(key(order.customerId, c.materialId), (balances.get(key(order.customerId, c.materialId)) ?? 0) - c.quantity);
  }
  for (const d of s.dispatches) { const t = orderTotals.get(d.orderId); if (t) t.dispatched += d.quantity; }
  for (const i of s.invoices) { const t = orderTotals.get(i.orderId); if (t) t.billed += i.quantity; }
  const total = [...orderTotals.values()].reduce((a, t) => ({ produced: a.produced + t.produced, accepted: a.accepted + t.accepted, rejected: a.rejected + t.rejected, pending: a.pending + t.pending, dispatched: a.dispatched + t.dispatched, billed: a.billed + t.billed }), { produced: 0, accepted: 0, rejected: 0, pending: 0, dispatched: 0, billed: 0 });
  const outstanding = s.orders.filter(o => orderTotals.get(o.id)!.dispatched < o.quantity);
  const dueOrders = outstanding.filter(o => o.due <= cutoff).sort((a, b) => a.due.localeCompare(b.due) || a.number.localeCompare(b.number));
  const overdue = dueOrders.filter(o => o.due < date), dueSoon = dueOrders.filter(o => o.due >= date);
  const linesByProduct = new Map<string, typeof bom.lines>();
  for (const line of bom.lines) { const rows = linesByProduct.get(line.productId) ?? []; rows.push(line); linesByProduct.set(line.productId, rows); }
  const requirements = new Map<string, { customerId: string; materialId: string; required: number }>();
  for (const o of outstanding) {
    const t = orderTotals.get(o.id)!;
    const remaining = Math.max(0, o.quantity - t.accepted - t.pending);
    for (const line of linesByProduct.get(o.productId) ?? []) {
      const k = key(o.customerId, line.materialId), prior = requirements.get(k);
      requirements.set(k, { customerId: o.customerId, materialId: line.materialId, required: (prior?.required ?? 0) + remaining * line.quantity });
    }
  }
  const shortages: StockShortage[] = [...requirements.values()].map(r => ({ ...r, customer: customers.get(r.customerId) ?? r.customerId, material: materials.get(r.materialId) ?? r.materialId, available: balances.get(key(r.customerId, r.materialId)) ?? 0, shortfall: r.required - (balances.get(key(r.customerId, r.materialId)) ?? 0) })).filter(r => r.shortfall > 0).sort((a, b) => b.shortfall - a.shortfall || a.materialId.localeCompare(b.materialId));
  const unbilledOrders = s.orders.filter(o => orderTotals.get(o.id)!.dispatched > orderTotals.get(o.id)!.billed);
  const unbilledPaise = unbilledOrders.reduce((n, o) => n + (orderTotals.get(o.id)!.dispatched - orderTotals.get(o.id)!.billed) * o.ratePaise, 0);
  function status(order: Order) {
    const t = orderTotals.get(order.id)!;
    if (t.dispatched >= order.quantity) return 'Dispatched';
    if (order.due < date) return 'Overdue';
    if (t.accepted >= order.quantity) return 'Ready to dispatch';
    if (t.pending) return 'Pending QC';
    return t.produced ? 'In production' : 'Planned';
  }
  const activity = s.audit.filter(a => ['production', 'inward', 'dispatch', 'invoice'].includes(a.action)).slice(-8).reverse().map(a => {
    const record = a.action === 'production' ? s.production.find(p => p.id === a.recordId) : a.action === 'inward' ? s.inwards.find(i => i.id === a.recordId) : a.action === 'dispatch' ? s.dispatches.find(d => d.id === a.recordId) : s.invoices.find(i => i.id === a.recordId);
    const order = record && 'orderId' in record ? ordersById.get(record.orderId) : undefined;
    const customerId = record && 'customerId' in record ? record.customerId : order?.customerId;
    return { ...a, quantity: record?.quantity, order: order?.number, customer: customerId ? customers.get(customerId) : undefined, reference: record && 'challan' in record ? record.challan : record && 'number' in record ? record.number : order?.number };
  });
  return { date, cutoff, customers, products, orderTotals, total, outstanding, dueOrders, overdue, dueSoon, shortages, producedToday, rejectedToday, oldQcPieces, oldQcEntries, unbilledOrders, unbilledPaise, ready: total.accepted - total.dispatched, receivedComponents: s.inwards.reduce((n, i) => n + i.quantity, 0), activity, status };
}

export function backupAge(timestamp: string | undefined, now = new Date()) {
  if (!timestamp || !Number.isFinite(Date.parse(timestamp)) || Date.parse(timestamp) > now.getTime()) return null;
  return Math.round((Date.parse(`${indiaDate(now)}T12:00:00Z`) - Date.parse(`${indiaDate(timestamp)}T12:00:00Z`)) / 86400000);
}

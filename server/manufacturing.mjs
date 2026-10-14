export const moveSign = type => type === 'adjustment-in' ? 1 : -1;
export const moveLabel = type => ({ return: 'Material return', 'adjustment-in': 'Correction: add', 'adjustment-out': 'Correction: remove' })[type] ?? type;
export function componentStock(state, customerId, materialId) {
  const receipts = state.inwards.filter(row => row.customerId === customerId && row.materialId === materialId).reduce((sum, row) => sum + row.quantity, 0);
  const orders = new Map(state.orders.map(row => [row.id, row]));
  const consumed = state.production.filter(row => orders.get(row.orderId)?.customerId === customerId).reduce((sum, row) => sum + row.consumption.filter(item => item.materialId === materialId).reduce((n, item) => n + item.quantity, 0), 0);
  const changes = (state.materialMoves ?? []).filter(row => row.customerId === customerId && row.materialId === materialId).reduce((sum, row) => sum + moveSign(row.type) * row.quantity, 0);
  return receipts + changes - consumed;
}
export const billPaid = (state, invoiceId) => (state.payments ?? []).filter(row => row.invoiceId === invoiceId).reduce((sum, row) => sum + row.amountPaise, 0);

// Reconstruct the actual posting sequence, not document-date order. Backdated
// entries keep their document dates without inventing historical stock balances.
export function componentLedger(state) {
  const audit = new Map(state.audit.map((row, index) => [`${row.action}:${row.recordId}`, { index, ...row }]));
  const orders = new Map(state.orders.map(row => [row.id, row]));
  const rows = [];
  const add = (record, action, row) => {
    const posting = audit.get(`${action}:${record.id}`);
    rows.push({ ...row, id: `${action}:${record.id}:${row.materialId}`, date: record.date, createdAt: posting?.createdAt ?? record.createdAt ?? '', actor: posting?.actor ?? '', sequence: posting?.index ?? -1, fallback: rows.length });
  };
  for (const row of state.inwards) add(row, 'inward', { customerId: row.customerId, materialId: row.materialId, kind: 'Material inward', reference: row.challan, received: row.quantity, issued: 0, note: '' });
  for (const row of state.production) for (const item of row.consumption) add(row, 'production', { customerId: orders.get(row.orderId)?.customerId ?? '', materialId: item.materialId, kind: 'Production consumption', reference: orders.get(row.orderId)?.number ?? '', received: 0, issued: item.quantity, note: `${row.quantity} products · includes pieces later rejected` });
  for (const row of state.materialMoves ?? []) add(row, 'material-move', { customerId: row.customerId, materialId: row.materialId, kind: moveLabel(row.type), reference: row.reference, received: moveSign(row.type) > 0 ? row.quantity : 0, issued: moveSign(row.type) < 0 ? row.quantity : 0, note: row.note });
  rows.sort((a, b) => a.sequence - b.sequence || a.fallback - b.fallback);
  const balances = new Map();
  return rows.map(row => {
    const key = JSON.stringify([row.customerId, row.materialId]);
    const balance = (balances.get(key) ?? 0) + row.received - row.issued;
    balances.set(key, balance);
    return { ...row, balance };
  });
}

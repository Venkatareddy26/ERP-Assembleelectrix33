// Advisory party credit settings. Keep this independent of commerce so that
// commerce can normalize the append-only setting without an import cycle.
export function normalizePartyCredit(state, input) {
  const partyId = typeof input.partyId === 'string' ? input.partyId.trim() : '';
  const records = state.businessRecords ?? [];
  if (!(state.customers ?? []).some(c => c.id === partyId) && !records.some(r => r.kind === 'supplier' && r.id === partyId)) throw new Error('Party was not found.');
  const data = input.data ?? {};
  if (!['true', 'false'].includes(data.enabled)) throw new Error('Choose whether the credit warning is enabled.');
  const limit = typeof data.limit === 'string' ? data.limit.trim() : '';
  if (!/^\d+(?:\.\d{1,2})?$/.test(limit) || Number(limit) > 1_000_000) throw new Error('Credit limit must be between ₹0 and ₹10,00,000, with at most two decimal places.');
  return { partyId, data: { enabled: data.enabled, limit: (Math.round(Number(limit) * 100) / 100).toFixed(2) } };
}

export function partyCredit(state, partyId) {
  const records = state.businessRecords ?? [];
  const customer = (state.customers ?? []).some(c => c.id === partyId);
  const supplier = records.some(r => r.kind === 'supplier' && r.id === partyId);
  const setting = records.filter(r => r.kind === 'party-credit' && r.partyId === partyId).at(-1);
  const enabled = !!(customer || supplier) && setting?.data.enabled === 'true';
  const limitPaise = setting ? Math.round(Number(setting.data.limit) * 100) : 0;
  let balancePaise = 0;
  if (customer) {
    const orderIds = new Set((state.orders ?? []).filter(r => r.customerId === partyId).map(r => r.id));
    const invoices = (state.invoices ?? []).filter(r => orderIds.has(r.orderId));
    const invoiceIds = new Set(invoices.map(r => r.id));
    balancePaise += invoices.reduce((n, r) => n + r.amountPaise, 0);
    balancePaise -= (state.payments ?? []).filter(r => invoiceIds.has(r.invoiceId)).reduce((n, r) => n + r.amountPaise, 0);
  }
  const positive = customer ? ['sale', 'sale-refund', 'opening-receivable'] : ['purchase', 'purchase-refund', 'opening-payable'];
  const negative = customer ? ['payment-in', 'credit'] : ['payment-out', 'debit'];
  if (customer || supplier) for (const row of records) if (row.partyId === partyId) {
    if (positive.includes(row.kind)) balancePaise += row.amountPaise;
    if (negative.includes(row.kind)) balancePaise -= row.amountPaise;
  }
  return { enabled, limitPaise, balancePaise, exceeded: enabled && balancePaise > limitPaise, remainingPaise: limitPaise - balancePaise };
}

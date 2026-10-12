import ExcelJS from 'exceljs';

const column = (key, width = 20, type = 'text') => ({ key, width, type });
const date = key => column(key, 19, 'date');
const number = key => column(key, Math.max(18, key.length + 3), 'number');
const money = key => column(key, Math.max(22, key.length + 3), 'money');

// Export saved snapshots, not editable formulas. IDs and customer-entered text
// remain string cells, including values starting with =, +, - or @.
export function exportSheets({ state: s, bom: b }, section, options = {}) {
  const customer = id => s.customers.find(c => c.id === id)?.name ?? '';
  const product = id => b.products.find(p => p.id === id)?.name ?? '';
  const order = id => s.orders.find(o => o.id === id);
  const worker = id => s.workers.find(w => w.id === id)?.name ?? '';
  const sheet = (name, columns, rows, note = '') => ({ name, columns, rows, note });
  const production = s.production.map(p => ({ Order: order(p.orderId)?.number, Customer: customer(order(p.orderId)?.customerId), Worker: worker(p.workerId), Date: p.date, Produced: p.quantity, Accepted: p.inspected ? p.accepted : 'Pending', Rejected: p.inspected ? p.rejected : 'Pending', Quality: p.inspected ? 'Inspected' : 'Awaiting inspection', 'Rejection reason': p.note || '' }));
  switch (section) {
    case 'billing': return [sheet('Job-work bills', [column('Bill'), column('Customer', 36), date('Date'), column('Order'), number('Quantity'), money('Rate INR'), money('Amount INR')], s.invoices.map(i => ({ Bill: i.number, Customer: customer(order(i.orderId)?.customerId), Date: i.date, Order: order(i.orderId)?.number, Quantity: i.quantity, 'Rate INR': i.ratePaise / 100, 'Amount INR': i.amountPaise / 100 })), 'Job-work charges before tax. Customer-owned material value is excluded. Not a tax invoice.')];
    case 'customers': return [
      sheet('Customers', [column('Customer', 36), column('Contact or reference', 44), number('Job orders')], s.customers.map(c => ({ Customer: c.name, 'Contact or reference': c.contact, 'Job orders': s.orders.filter(o => o.customerId === c.id).length }))),
      sheet('Product rates', [column('Customer', 36), column('Product ID'), column('Product description', 60), money('Customer rate INR')], s.rates.map(r => ({ Customer: customer(r.customerId), 'Product ID': r.productId, 'Product description': product(r.productId), 'Customer rate INR': r.ratePaise / 100 })), 'Current customer rate per piece. Existing orders retain their agreed rates.')
    ];
    case 'orders': return [sheet('Job orders', [column('Order'), column('Customer', 36), column('Product ID'), number('Ordered'), number('Produced'), number('Accepted'), number('Rejected'), number('Pending QC'), number('Dispatched'), number('Billed'), money('Customer rate INR'), date('Due')], s.orders.map(o => {
      const entries = s.production.filter(p => p.orderId === o.id);
      return { Order: o.number, Customer: customer(o.customerId), 'Product ID': o.productId, Ordered: o.quantity, Produced: entries.reduce((n, p) => n + p.quantity, 0), Accepted: entries.reduce((n, p) => n + p.accepted, 0), Rejected: entries.reduce((n, p) => n + p.rejected, 0), 'Pending QC': entries.filter(p => !p.inspected).reduce((n, p) => n + p.quantity, 0), Dispatched: s.dispatches.filter(d => d.orderId === o.id).reduce((n, d) => n + d.quantity, 0), Billed: s.invoices.filter(i => i.orderId === o.id).reduce((n, i) => n + i.quantity, 0), 'Customer rate INR': o.ratePaise / 100, Due: o.due };
    }))];
    case 'inventory': {
      const balances = new Map();
      for (const inward of s.inwards) {
        const key = `${inward.customerId}:${inward.materialId}`;
        const balance = balances.get(key) ?? { Customer: customer(inward.customerId), 'Material ID': inward.materialId, Description: b.materials.find(m => m.id === inward.materialId)?.name, Received: 0, Consumed: 0 };
        balance.Received += inward.quantity; balances.set(key, balance);
      }
      for (const p of s.production) for (const c of p.consumption) {
        const balance = balances.get(`${order(p.orderId)?.customerId}:${c.materialId}`);
        if (balance) balance.Consumed += c.quantity;
      }
      return [sheet('Stock balances', [column('Customer', 36), column('Material ID'), column('Description', 60), number('Received'), number('Consumed'), number('Balance')], [...balances.values()].map(r => ({ ...r, Balance: r.Received - r.Consumed }))), sheet('Inward register', [column('Customer', 36), column('Material ID'), column('Challan', 30), date('Date'), number('Quantity')], s.inwards.map(i => ({ Customer: customer(i.customerId), 'Material ID': i.materialId, Challan: i.challan, Date: i.date, Quantity: i.quantity })))];
    }
    case 'production': case 'quality': return [sheet(section === 'quality' ? 'Quality register' : 'Production register', [column('Order'), column('Customer', 36), column('Worker', 30), date('Date'), number('Produced'), number('Accepted'), number('Rejected'), column('Quality', 24), column('Rejection reason', 48)], production, 'All saved entries, including entries awaiting inspection.')];
    case 'dispatch': return [sheet('Dispatch register', [column('Dispatch'), column('Order'), column('Customer', 36), column('Challan', 30), date('Date'), number('Quantity')], s.dispatches.map(d => ({ Dispatch: d.number, Order: order(d.orderId)?.number, Customer: customer(order(d.orderId)?.customerId), Challan: d.challan, Date: d.date, Quantity: d.quantity })))];
    case 'workers': {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(options.month ?? '')) throw new Error('Choose a valid earnings month.');
      return [sheet('Workers and earnings', [column('Worker', 30), column('Compensation', 24), money('Worker rate INR'), column('Rate basis', 28), column('Month', 16), number('Accepted pieces'), money('Piece earnings INR')], s.workers.map(w => {
        const entries = s.production.filter(p => p.workerId === w.id && p.date.startsWith(options.month));
        return { Worker: w.name, Compensation: w.type === 'piece' ? 'Piece rate' : 'Monthly salary', 'Worker rate INR': w.ratePaise / 100, 'Rate basis': w.type === 'piece' ? 'Per accepted piece' : 'Per month', Month: options.month, 'Accepted pieces': entries.reduce((n, p) => n + p.accepted, 0), 'Piece earnings INR': w.type === 'piece' ? entries.reduce((n, p) => n + p.accepted * p.wageRatePaise, 0) / 100 : 'Not applicable' };
      }), `Earnings month: ${options.month}. Earned piece wages, not payments. Monthly salaries are reference amounts; payroll is not calculated.`)];
    }
    case 'bom': {
      if (!b.products.some(p => p.id === options.productId)) throw new Error('Choose a valid product to export.');
      return [sheet('Product BOM', [column('Product ID'), column('Material ID'), column('Description', 64), number('Quantity per product'), number('Source row')], b.lines.filter(l => l.productId === options.productId).map(l => ({ 'Product ID': l.productId, 'Material ID': l.materialId, Description: b.materials.find(m => m.id === l.materialId)?.name, 'Quantity per product': l.quantity, 'Source row': l.sourceRow })), `${product(options.productId)}. Source: ${b.source}, ${b.sheet}. Units assumed pieces.`)];
    }
    default: throw new Error('Choose a module to export.');
  }
}

export async function buildWorkbook(workspace, section, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Assemble Electrix';
  workbook.created = new Date();
  for (const definition of exportSheets(workspace, section, options)) {
    const { columns, rows, note, name } = definition;
    const ws = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 5 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = columns.map(c => ({ key: c.key, width: c.width }));
    const mergeText = (row, text) => { ws.mergeCells(row, 1, row, columns.length); ws.getCell(row, 1).value = text; };
    mergeText(1, `ASSEMBLE ELECTRIX  /  ${name}`);
    ws.getRow(1).height = 34;
    ws.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF112C34' } };
    mergeText(2, `${workspace.mode === 'demo' ? 'DEMO RECORDS' : 'ACTUAL RECORDS'} • Exported ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date())} IST • All saved records in this module`);
    mergeText(3, note || 'Saved operational records. Quantities are in pieces.');
    for (const row of [2, 3]) { ws.getRow(row).height = 30; ws.getCell(row, 1).alignment = { wrapText: true, vertical: 'middle' }; ws.getCell(row, 1).font = { name: 'Calibri', size: 11, color: { argb: 'FF52696F' } }; }
    const header = ws.getRow(5); header.values = columns.map(c => c.key); header.height = 32;
    header.eachCell(cell => { cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF087F72' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    for (const record of rows) {
      const row = ws.addRow(columns.map(c => c.type === 'date' && record[c.key] ? new Date(`${record[c.key]}T00:00:00Z`) : record[c.key] ?? ''));
      let lineCount = 1;
      row.eachCell((cell, index) => {
        const c = columns[index - 1];
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF18343C' } };
        cell.alignment = { vertical: 'middle', wrapText: c.type === 'text', horizontal: c.type === 'number' || c.type === 'money' ? 'right' : 'left' };
        cell.numFmt = c.type === 'date' ? 'dd mmm yyyy' : c.type === 'money' ? '#,##0.00' : c.type === 'number' ? '#,##0.###' : '@';
        if (row.number % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F6F5' } };
        if (c.type === 'text') lineCount = Math.max(lineCount, ...String(cell.value ?? '').split(/\r?\n/).map(line => Math.ceil(line.length / (c.width - 3))));
      });
      row.height = Math.min(409, Math.max(28, lineCount * 16 + 10));
    }
    if (!rows.length) { mergeText(6, 'No records saved yet.'); ws.getRow(6).height = 28; }
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, 5 + rows.length), column: columns.length } };
    ws.pageSetup.printTitlesRow = '1:5';
    ws.headerFooter.oddFooter = 'Assemble Electrix | &P of &N';
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

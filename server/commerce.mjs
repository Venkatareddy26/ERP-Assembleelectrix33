// Purchased stock and trading documents are separate from customer-owned BOM stock.
export const businessKinds = ['supplier','item','company','sale','estimate','proforma','sales-order','delivery','purchase','purchase-order','credit','debit','payment-in','payment-out','expense','account','cash-adjustment','cheque','cheque-event','loan','loan-payment'];
export const documentKinds = ['sale','estimate','proforma','sales-order','delivery','purchase','purchase-order'];
const prefixes = {supplier:'SUP',item:'ITM',company:'CO',sale:'INV',estimate:'EST',proforma:'PRO','sales-order':'SO',delivery:'CH',purchase:'PUR','purchase-order':'PO',credit:'CN',debit:'DN','payment-in':'IN','payment-out':'OUT',expense:'EXP',account:'BANK','cash-adjustment':'CASH',cheque:'CHQ','cheque-event':'CHS',loan:'LOAN','loan-payment':'EMI'};
const fail = message => { throw new Error(message); };
const str = (value, label, required = true) => typeof value === 'string' && value.length <= 250 && (!required || value.trim()) ? value.trim() : fail(`${label} is required (up to 250 characters).`);
const cash = (value, label, zero = false) => { const n = Number(value); if (value === '' || value == null || !Number.isFinite(n) || n < (zero ? 0 : .01) || n > 1000000 || Math.abs(n * 100 - Math.round(n * 100)) > .00001) fail(`${label} must be ${zero ? 'zero or ' : ''}positive, with at most 2 decimals (maximum ₹10,00,000).`); return Math.round(n * 100); };
const num = (value, label, minimum, maximum) => { const n = Number(value); if (value === '' || value == null || !Number.isFinite(n) || n < minimum || n > maximum) fail(`Enter a valid ${label}.`); return n; };
const day = value => { const v = str(value, 'Date'); if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0,10) !== v) fail('Enter a valid date.'); return v; };
export const businessRows = state => state.businessRecords || [];
export function cashBalance(state) {
  return (state.payments||[]).filter(p=>p.method==='cash').reduce((n,p)=>n+p.amountPaise,0)+businessRows(state).reduce((n,r)=>n+(r.kind==='loan'||r.kind==='cash-adjustment'&&r.data.direction==='in'||r.kind==='payment-in'&&r.method==='cash'?r.amountPaise:0)-(r.kind==='cash-adjustment'&&r.data.direction==='out'||['payment-out','expense','loan-payment'].includes(r.kind)&&r.method==='cash'?r.amountPaise:0),0);
}
export function ownedStock(state, itemId) {
  return businessRows(state).reduce((sum, row) => sum + (row.lines || []).filter(l => l.itemId === itemId).reduce((n, l) => n + l.quantity, 0) * (['purchase','credit'].includes(row.kind) ? 1 : ['sale','delivery','debit'].includes(row.kind) && !(row.kind === 'sale' && businessRows(state).find(s => s.id === row.sourceId)?.kind === 'delivery') ? -1 : 0), 0);
}
export function businessDue(state, record) {
  const rows = businessRows(state);
  return record.amountPaise - rows.filter(r => r.sourceId === record.id && ['payment-in','payment-out','credit','debit'].includes(r.kind)).reduce((sum,r) => sum + r.amountPaise, 0);
}
export function loanSchedule(record) {
  const months=Number(record.data.months),rate=Number(record.data.interest)/1200;
  const emi=rate?Math.round(record.amountPaise*rate/(1-(1+rate)**-months)):Math.round(record.amountPaise/months);
  let balance=record.amountPaise;const result=[];
  for(let month=1;month<=months;month++){const interest=Math.round(balance*rate),amount=month===months?balance+interest:Math.min(emi,balance+interest),principal=amount-interest;balance-=principal;result.push({month,amount,interest,principal,balance});}
  return result;
}
export function loanTotal(record) {return loanSchedule(record).reduce((n,p)=>n+p.amount,0);}
export function loanPrincipalPaid(record,paid) {
  let remaining=paid,principal=0;
  for(const p of loanSchedule(record)){const amount=Math.min(remaining,p.amount);principal+=Math.max(0,amount-p.interest);remaining-=amount;if(remaining<=0)break;}
  return principal;
}
export function createBusinessRecord(state, input, id = crypto.randomUUID(), createdAt = new Date().toISOString()) {
  if (!businessKinds.includes(input.kind)) fail('Choose a valid transaction type.');
  const rows = businessRows(state), kind = input.kind, data = input.data || {};
  let index = rows.filter(r => r.kind === kind).length + 1;
  while(rows.some(r => r.number === `${prefixes[kind]}-${String(index).padStart(4,'0')}`)) index++;
  const row = {id,kind,number:`${prefixes[kind]}-${String(index).padStart(4,'0')}`,date:day(input.date),partyId:'',sourceId:'',reference:str(input.reference || '', 'Reference', false),note:str(input.note || '', 'Notes', false),method:'',accountId:'',amountPaise:0,lines:[],data:{},createdAt};
  if (row.reference && rows.some(r => r.kind === kind && r.reference === row.reference)) fail('This reference is already recorded.');
  const find = (key, allowed, label) => rows.find(r => r.id === key && allowed.includes(r.kind)) || fail(`${label} was not found.`);
  if (['supplier','item','company','account','loan'].includes(kind)) {
    row.data.name = str(data.name, 'Name');
    if (kind !== 'company' && rows.some(r => r.kind === kind && r.data.name.toLowerCase() === row.data.name.toLowerCase())) fail('This name already exists.');
  }
  if (kind === 'supplier' || kind === 'company') {
    for (const key of ['phone','email','address','gstin']) row.data[key] = str(data[key] || '', key, false);
    if (row.data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.data.email)) fail('Enter a valid email address.');
  }
  if (kind === 'item') {
    if (!['product','service'].includes(data.type)) fail('Select product or service.');
    row.data.type = data.type;
    for (const key of ['unit','code','hsn','category']) row.data[key] = str(data[key] || (key === 'unit' ? 'pcs' : ''), key, false);
    if(row.data.code && rows.some(r => r.kind === 'item' && r.data.code === row.data.code)) fail('Item code already exists.');
    row.data.salePrice = String(cash(data.salePrice, 'Sale price', true) / 100);
    row.data.purchasePrice = String(cash(data.purchasePrice, 'Purchase price', true) / 100);
    row.data.tax = String(num(data.tax, 'tax percentage', 0, 100));
  }
  if (documentKinds.includes(kind)) {
    const purchase = kind === 'purchase' || kind === 'purchase-order';
    row.partyId = str(input.partyId, purchase ? 'Supplier' : 'Customer');
    if (purchase) find(row.partyId,['supplier'],'Supplier');
    else if (!state.customers.some(c => c.id === row.partyId)) fail('Customer was not found.');
    if (input.sourceId) {
      const source = find(input.sourceId, kind === 'sale' ? ['estimate','proforma','sales-order','delivery'] : kind === 'purchase' ? ['purchase-order'] : [], 'Source document');
      if(rows.some(r => r.sourceId === source.id && ['sale','purchase'].includes(r.kind))) fail('This document has already been converted.');
      if(source.partyId !== row.partyId || row.date < source.date) fail('Conversion must keep the party and cannot predate its source.');
      row.sourceId = source.id;
      row.lines = structuredClone(source.lines);
    } else {
      if(!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 100) fail('Add between 1 and 100 item lines.');
      const seen = new Set();
      row.lines = input.lines.map(line => {
        const item = find(line.itemId,['item'],'Item');
        if(seen.has(item.id)) fail('Combine duplicate item lines.'); seen.add(item.id);
        const quantity = num(line.quantity, 'quantity', .001, 10000000);
        if(Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > .00001) fail('Quantity supports at most 3 decimals.');
        const ratePaise = cash(line.rate, 'Rate'), discountBps = Math.round(num(line.discount ?? 0,'discount',0,100) * 100), taxBps = Math.round(num(line.tax ?? item.data.tax,'tax',0,100) * 100);
        const net = Math.round(quantity * ratePaise * (10000 - discountBps) / 10000);
        return {itemId:item.id,name:item.data.name,quantity,ratePaise,discountBps,taxBps,amountPaise:net + Math.round(net * taxBps / 10000)};
      });
    }
    row.amountPaise = row.lines.reduce((sum,l) => sum+l.amountPaise,0);
    if(!Number.isSafeInteger(row.amountPaise) || row.amountPaise <= 0 || row.amountPaise > 100000000000) fail('Document total is outside the supported range.');
    if(['sale','delivery'].includes(kind) && !(kind === 'sale' && rows.find(s => s.id === row.sourceId)?.kind === 'delivery')) {
      for(const line of row.lines) if(find(line.itemId,['item'],'Item').data.type === 'product' && line.quantity > ownedStock(state,line.itemId)) fail(`Not enough purchased stock for ${line.name}. Customer-owned BOM stock is kept separate.`);
    }
  }
  if(['credit','debit'].includes(kind)) {
    const source = find(input.sourceId,kind === 'credit' ? ['sale'] : ['purchase'],'Original bill');
    if(rows.some(r => r.sourceId === source.id && ['credit','debit','payment-in','payment-out'].includes(r.kind))) fail('Only an unpaid, unreturned bill can be returned in full.');
    if(row.date < source.date) fail('Return cannot predate its bill.');
    row.sourceId=source.id;row.partyId=source.partyId;row.lines=structuredClone(source.lines);row.amountPaise=source.amountPaise;
    row.note=str(input.note,'Return reason');
    if(kind === 'debit') for(const l of row.lines) if(find(l.itemId,['item'],'Item').data.type === 'product' && l.quantity > ownedStock(state,l.itemId)) fail('Purchased stock has already been used; this full return is unavailable.');
  }
  if(['payment-in','payment-out','expense','cash-adjustment','loan-payment'].includes(kind)) {
    row.amountPaise=cash(input.amount,'Amount');
    if(!['cash','bank','upi','other'].includes(input.method)) fail('Select a payment method.');
    row.method=input.method;
    if(input.accountId) {find(input.accountId,['account'],'Bank account');row.accountId=input.accountId;}
    if(['bank','upi'].includes(row.method) && !row.accountId) fail('Select the bank account for this payment.');
    if(['payment-in','payment-out'].includes(kind)) {
      const source=find(input.sourceId,kind === 'payment-in' ? ['sale'] : ['purchase'],'Bill');
      if(row.date < source.date || row.amountPaise > businessDue(state,source)) fail('Payment must follow the bill date and cannot exceed its balance.');
      row.sourceId=source.id;row.partyId=source.partyId;
    }
    if(kind === 'expense') {row.data.category=str(data.category,'Expense category');row.data.name=str(data.name,'Expense description');}
    if(kind === 'cash-adjustment') {if(!['in','out'].includes(data.direction)) fail('Select add or remove cash.');row.data.direction=data.direction;row.note=str(input.note,'Adjustment reason');if(row.method !== 'cash') fail('Cash corrections must use cash.');}
    if(kind === 'loan-payment') {const loan=find(input.sourceId,['loan'],'Loan');if(row.date < loan.date || row.amountPaise > loanTotal(loan)-rows.filter(r=>r.kind==='loan-payment'&&r.sourceId===loan.id).reduce((n,r)=>n+r.amountPaise,0)) fail('Repayment exceeds the remaining scheduled loan total or predates the loan.');row.sourceId=loan.id;}
  }
  if(kind === 'account') {
    row.amountPaise=cash(input.amount ?? 0,'Opening balance',true);
    for(const key of ['bank','accountNumber','ifsc','upi']) row.data[key]=str(data[key] || '',key,false);
  }
  if(kind === 'cheque') {
    row.amountPaise=cash(input.amount,'Cheque amount');row.data.name=str(data.name,'Party name');row.data.due=day(data.due);row.data.chequeNumber=str(data.chequeNumber,'Cheque number');row.data.direction=str(data.direction,'Direction');
    if(!['in','out'].includes(row.data.direction) || row.data.due < row.date) fail('Choose a valid cheque direction and due date.');
    if(rows.some(r=>r.kind==='cheque'&&r.data.chequeNumber===row.data.chequeNumber)) fail('Cheque number already recorded.');
  }
  if(kind === 'loan') {
    row.amountPaise=cash(input.amount,'Principal');row.data.months=String(num(data.months,'repayment months',1,360));row.data.interest=String(num(data.interest,'annual interest',0,60));
    if(!Number.isInteger(Number(row.data.months))) fail('Repayment months must be whole.');
  }
  if(kind === 'cheque-event') {
    const cheque=find(input.sourceId,['cheque'],'Cheque');
    if(rows.some(r=>r.kind==='cheque-event'&&r.sourceId===cheque.id)) fail('This cheque has already been cleared or cancelled.');
    row.sourceId=cheque.id;row.data.status=str(data.status,'Cheque status');
    if(!['cleared','cancelled'].includes(row.data.status)||row.date<cheque.date) fail('Choose a valid status and date.');
    if(row.data.status==='cleared') {
      const bill=find(data.invoiceId,cheque.data.direction==='in'?['sale']:['purchase'],'Bill');
      find(input.accountId,['account'],'Bank account');row.accountId=input.accountId;row.data.invoiceId=bill.id;
      if(row.date<cheque.data.due||row.date<bill.date||cheque.amountPaise>businessDue(state,bill)) fail('Clearance must follow the cheque due date and fit the bill balance.');
    }
  }
  const after={...state,businessRecords:[...rows,row]};
  if(['sale','delivery','debit'].includes(kind)){
    const products=[...new Set(row.lines.map(l=>l.itemId))].filter(itemId=>rows.find(r=>r.id===itemId)?.data.type==='product');
    for(const date of [...new Set(after.businessRecords.map(r=>r.date))].sort())for(const itemId of products)if(ownedStock({...after,businessRecords:after.businessRecords.filter(r=>r.date<=date)},itemId)<-.000001)fail('The document would make dated owned-stock balances negative. Check the receipt and issue dates.');
  }
  if(row.method==='cash'&&['expense','payment-out','loan-payment','cash-adjustment'].includes(kind)){
    for(const date of [...new Set([...after.businessRecords.map(r=>r.date),...(state.payments||[]).map(p=>p.date)])].sort())if(cashBalance({...after,payments:(state.payments||[]).filter(p=>p.date<=date),businessRecords:after.businessRecords.filter(r=>r.date<=date)})<0)fail('Not enough cash in hand on this date. Record the opening cash or use the correct bank account.');
  }
  return row;
}
export function validateBusinessRecords(state) {
  if(state.businessRecords === undefined) return true;
  if(!Array.isArray(state.businessRecords) || state.businessRecords.length > 100000) return false;
  const accepted=[],ids=new Set();
  try {
    for(const row of state.businessRecords) {
      if(!row || typeof row.id !== 'string' || !row.id || row.id.length > 250 || ids.has(row.id) || typeof row.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(row.createdAt) || !Number.isFinite(Date.parse(row.createdAt))) return false;
      ids.add(row.id);
      const expected=createBusinessRecord({...state,businessRecords:accepted},{...row,amount:row.amountPaise/100,lines:row.lines?.map(l=>({...l,rate:l.ratePaise/100,discount:l.discountBps/100,tax:l.taxBps/100}))},row.id,row.createdAt);
      const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
      if(canonical(expected) !== canonical(row)) return false;
      accepted.push(expected);
    }
    for(const event of accepted.filter(r=>r.kind==='cheque-event'&&r.data.status==='cleared')){const cheque=accepted.find(r=>r.id===event.sourceId);if(!accepted.some(p=>p.kind===(cheque.data.direction==='in'?'payment-in':'payment-out')&&p.reference===cheque.number+'-cleared'&&p.sourceId===event.data.invoiceId&&p.accountId===event.accountId&&p.amountPaise===cheque.amountPaise&&p.date===event.date))return false;}
    return true;
  } catch {return false;}
}

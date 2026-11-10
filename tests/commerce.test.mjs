import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyState, execute, stock } from '../server/domain.mjs';
import { businessDue, ownedStock, cashBalance, loanTotal, loanSchedule, refundDue, returnableLines, lineNet } from '../server/commerce.mjs';
import { journal, accountBalances } from '../server/bookkeeping.mjs';
import { partyCredit } from '../server/party-credit.mjs';
import { validateBackup } from '../server/backup.mjs';
import { IDBFactory } from 'fake-indexeddb';
import { createBrowserStore } from '../src/lib/browser-store.mjs';
const bom=JSON.parse(readFileSync(new URL('../data/bom.json',import.meta.url),'utf8'));
function fixture(){let state=emptyState();const run=(kind,input={})=>{const result=execute(state,bom,'business-record',{kind,date:'2026-10-14',...input});state=result.state;return result.record};const c=execute(state,bom,'customer',{name:'Factory customer',contact:''});state=c.state;const supplier=run('supplier',{data:{name:'Supplier'}}),item=run('item',{data:{name:'Owned switch',type:'product',unit:'pcs',salePrice:20,purchasePrice:10,tax:18}});return{run,get state(){return state},customer:c.record,supplier,item,line:(quantity=10,rate=10)=>[{itemId:item.id,quantity,rate,tax:18,discount:0}]}}
test('Owned purchases, tax, quotation conversion, sale and partial collections preserve BOM stock and immutable totals',()=>{
 const f=fixture(),component=bom.materials[0].id,before=stock(f.state,f.customer.id,component);
 const purchase=f.run('purchase',{partyId:f.supplier.id,lines:f.line(10,10)});assert.equal(purchase.amountPaise,11800);assert.equal(ownedStock(f.state,f.item.id),10);
 const quote=f.run('estimate',{partyId:f.customer.id,lines:f.line(3,20)}),sale=f.run('sale',{partyId:f.customer.id,sourceId:quote.id});assert.equal(sale.amountPaise,7080);assert.equal(ownedStock(f.state,f.item.id),7);assert.equal(stock(f.state,f.customer.id,component),before);
 f.run('payment-in',{sourceId:sale.id,amount:20,method:'cash',reference:'unique'});assert.equal(businessDue(f.state,sale),5080);assert.equal(cashBalance(f.state),2000);assert.equal(sale.amountPaise,7080);assert.throws(()=>f.run('payment-in',{sourceId:sale.id,amount:60,method:'cash'}),/exceed/);assert.throws(()=>f.run('sale',{partyId:f.customer.id,sourceId:quote.id}),/already/);assert.throws(()=>f.run('sale',{partyId:f.customer.id,lines:f.line(8,20)}),/stock/);
});
test('Delivery conversion consumes stock once; full unpaid returns restore the correct stock and reverse taxes',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});const delivery=f.run('delivery',{partyId:f.customer.id,lines:f.line(4,20)}),sale=f.run('sale',{partyId:f.customer.id,sourceId:delivery.id});assert.equal(ownedStock(f.state,f.item.id),6);f.run('credit',{sourceId:sale.id,note:'Full unused return'});assert.equal(ownedStock(f.state,f.item.id),10);assert.equal(businessDue(f.state,sale),0);assert.throws(()=>f.run('credit',{sourceId:sale.id,note:'Again'}),/unreturned/);
 const js=journal(f.state);assert.equal(js.reduce((n,e)=>n+e.debit-e.credit,0),0);assert.equal(accountBalances(f.state).find(a=>a.account==='Cost of goods sold').debit,accountBalances(f.state).find(a=>a.account==='Cost of goods sold').credit);
});
test('Cash, bank, expenses and loan repayments create a balanced journal and reject impossible payments',()=>{
 const f=fixture(),bank=f.run('account',{data:{name:'Operating bank'},amount:500});f.run('cash-adjustment',{amount:100,method:'cash',data:{direction:'in'},note:'Opening cash'});f.run('expense',{amount:20,method:'cash',data:{name:'Courier',category:'Transport'}});assert.equal(cashBalance(f.state),8000);assert.throws(()=>f.run('expense',{amount:100,method:'cash',data:{name:'Large bill',category:'Other'}}),/cash/);f.run('expense',{amount:100,method:'bank',accountId:bank.id,data:{name:'Rent',category:'Rent'}});const loan=f.run('loan',{amount:1200,data:{name:'Working capital',months:12,interest:0}});assert.equal(loanTotal(loan),120000);f.run('loan-payment',{sourceId:loan.id,amount:100,method:'cash'});assert.equal(journal(f.state).reduce((n,e)=>n+e.debit-e.credit,0),0);assert.equal(accountBalances(f.state).find(a=>a.account==='Bank: Operating bank').debit-accountBalances(f.state).find(a=>a.account==='Bank: Operating bank').credit,40000);
});
test('Suite backups round-trip, reject tampered amounts, IDs, references and stock while old snapshots remain readable',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});const sale=f.run('sale',{partyId:f.customer.id,lines:f.line(2,20)});f.run('payment-in',{sourceId:sale.id,amount:10,method:'cash'});const backup={schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()};assert.deepEqual(validateBackup(backup,'actual',bom),backup);
 for(const alter of [b=>b.state.businessRecords.at(-2).amountPaise++,b=>b.state.businessRecords[0].id=b.state.businessRecords[1].id,b=>b.state.businessRecords.at(-1).amountPaise=900000]){const bad=structuredClone(backup);alter(bad);assert.throws(()=>validateBackup(bad,'actual',bom),/damaged/)}
 assert.doesNotThrow(()=>validateBackup({schemaVersion:1,mode:'actual',bom,state:emptyState(),exportedAt:new Date().toISOString()},'actual',bom));
});
test('Batch item imports are atomic, reject duplicates, preserve revision and prevent formula-like names becoming executable',()=>{
 const state=emptyState(),item={name:'=not a formula',type:'service',unit:'job',salePrice:10,purchasePrice:0,tax:0};assert.throws(()=>execute(state,bom,'business-import',{items:[item,item]}),/exists/);assert.equal(state.revision,0);assert.equal(state.businessRecords,undefined);const result=execute(state,bom,'business-import',{items:[item]});assert.equal(result.state.businessRecords[0].data.name,'=not a formula');assert.equal(result.state.revision,1);
});
test('Dated stock and cash cannot borrow receipts from the future',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});assert.throws(()=>f.run('sale',{date:'2026-10-13',partyId:f.customer.id,lines:f.line(1,20)}),/dated/);f.run('cash-adjustment',{amount:100,method:'cash',data:{direction:'in'},note:'Opening'});assert.throws(()=>f.run('expense',{date:'2026-10-13',amount:10,method:'cash',data:{name:'Courier',category:'Post'}}),/cash/);
});
test('POS sale and payment commit together; failed receipt validation cannot leave a bill or consume stock',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});const state=structuredClone(f.state),input={date:'2026-10-14',partyId:f.customer.id,lines:f.line(1,20),received:25,method:'cash'};const result=execute(state,bom,'pos-sale',input);assert.equal(ownedStock(result.state,f.item.id),9);const sale=result.state.businessRecords.find(r=>r.kind==='sale');assert.equal(businessDue(result.state,sale),0);assert.equal(cashBalance(result.state),2360);assert.equal(state.revision,f.state.revision);for(const received of [-1,1.123])assert.throws(()=>execute(state,bom,'pos-sale',{...input,received}),/received/);assert.throws(()=>execute(state,bom,'pos-sale',{...input,method:'bank'}),/exceed/);assert.equal(ownedStock(state,f.item.id),10);assert.equal(state.businessRecords.filter(r=>r.kind==='sale').length,0);
});
test('Cheque clearance settles a real bill through the selected bank once, and cancellation moves no money',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});const sale=f.run('sale',{partyId:f.customer.id,lines:f.line(1,20)}),bank=f.run('account',{data:{name:'Collections bank'},amount:0}),cheque=f.run('cheque',{amount:23.60,data:{name:'Factory customer',chequeNumber:'1001',direction:'in',due:'2026-10-14'}});const event=f.run('cheque-event',{sourceId:cheque.id,accountId:bank.id,data:{status:'cleared',invoiceId:sale.id}});assert.equal(event.amountPaise,0);assert.equal(businessDue(f.state,sale),0);assert.throws(()=>f.run('cheque-event',{sourceId:cheque.id,data:{status:'cancelled'}}),/already/);assert.equal(accountBalances(f.state).find(a=>a.account==='Bank: Collections bank').debit,2360);const backup={schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()};assert.doesNotThrow(()=>validateBackup(backup,'actual',bom));const missingReceipt=structuredClone(backup);missingReceipt.state.businessRecords.pop();assert.throws(()=>validateBackup(missingReceipt,'actual',bom),/damaged/);
 const unused=f.run('cheque',{amount:5,data:{name:'Someone',chequeNumber:'1002',direction:'out',due:'2026-10-14'}});f.run('cheque-event',{sourceId:unused.id,data:{status:'cancelled'}});assert.equal(accountBalances(f.state).find(a=>a.account==='Bank: Collections bank').debit,2360);
});
test('Suite data persists across browser clients, stays isolated, rejects stale writes and restores v3 snapshots',async()=>{
 const indexedDBFactory=new IDBFactory(),store=createBrowserStore({bom,indexedDBFactory});let state=(await store.load('actual')).state;let result=await store.save('actual','business-record',{kind:'item',date:'2026-10-14',data:{name:'Service',type:'service',salePrice:100,purchasePrice:0,tax:0,unit:'job'}},state.revision);const oldRevision=state.revision;state=result.state;assert.equal((await createBrowserStore({bom,indexedDBFactory}).load('actual')).state.businessRecords[0].data.name,'Service');await assert.rejects(store.save('actual','business-record',{kind:'company',date:'2026-10-14',data:{name:'Stale update'}},oldRevision),/changed/);assert.equal((await store.load('demo')).state.businessRecords,undefined);const backup={schemaVersion:3,mode:'actual',bom,state,exportedAt:new Date().toISOString()};await store.save('actual','business-record',{kind:'company',date:'2026-10-14',data:{name:'Company'}},state.revision);const current=await store.load('actual');const restored=await store.restore('actual',backup,current.state.revision);assert.equal(restored.state.businessRecords.length,1);assert(restored.state.revision>current.state.revision);
});
test('Reducing-interest loan schedule rounds the final instalment and repayments reconcile principal and interest',()=>{
 const f=fixture(),loan=f.run('loan',{amount:1200,data:{name:'Reducing loan',months:12,interest:12}}),schedule=loanSchedule(loan);
 assert.equal(schedule.at(-1).balance,0);assert.equal(schedule.reduce((n,p)=>n+p.principal,0),loan.amountPaise);assert(schedule[0].interest>schedule[1].interest);f.run('cash-adjustment',{amount:100,method:'cash',data:{direction:'in'},note:'Funds for interest'});
 const first=schedule[0];f.run('loan-payment',{sourceId:loan.id,amount:first.amount/100,method:'cash'});let balances=accountBalances(f.state);assert.equal(balances.find(a=>a.account==='Loan: Reducing loan').debit,first.principal);assert.equal(balances.find(a=>a.account==='Loan interest').debit,first.interest);
 f.run('loan-payment',{sourceId:loan.id,amount:(loanTotal(loan)-first.amount)/100,method:'cash'});balances=accountBalances(f.state);const liability=balances.find(a=>a.account==='Loan: Reducing loan');assert.equal(liability.debit,liability.credit);assert.equal(balances.find(a=>a.account==='Loan interest').debit,loanTotal(loan)-loan.amountPaise);
});


test('Paid sales accept partial returns, preserve original prices and cap customer refunds',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});const sale=f.run('sale',{partyId:f.customer.id,lines:f.line(3,20)});
 f.run('payment-in',{sourceId:sale.id,amount:70.80,method:'cash'});
 const credit=f.run('credit',{sourceId:sale.id,note:'One damaged switch',lines:[{itemId:f.item.id,quantity:1,rate:999,tax:0}]});
 assert.equal(credit.amountPaise,2360);assert.equal(credit.lines[0].ratePaise,2000);assert.equal(ownedStock(f.state,f.item.id),8);assert.equal(businessDue(f.state,sale),0);assert.equal(refundDue(f.state,sale),2360);
 f.run('sale-refund',{sourceId:sale.id,amount:10,method:'cash',note:'Cash returned'});assert.equal(refundDue(f.state,sale),1360);assert.throws(()=>f.run('sale-refund',{sourceId:sale.id,amount:14,method:'cash',note:'Too much'}),/exceeds/);
 f.run('sale-refund',{sourceId:sale.id,amount:13.60,method:'cash',note:'Remaining refund'});assert.equal(refundDue(f.state,sale),0);assert.equal(cashBalance(f.state),4720);
 const cost=accountBalances(f.state).find(a=>a.account==='Cost of goods sold');assert.equal(cost.debit-cost.credit,2000);assert.equal(journal(f.state).reduce((n,e)=>n+e.debit-e.credit,0),0);
 const backup={schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()};assert.doesNotThrow(()=>validateBackup(backup,'actual',bom));
 const bad=structuredClone(backup);bad.state.businessRecords.find(r=>r.kind==='credit').lines[0].netPaise++;assert.throws(()=>validateBackup(bad,'actual',bom),/damaged/);
});
test('Many fractional returns allocate every original paise once, including tax and historical cost',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line(3,.01)});const sale=f.run('sale',{partyId:f.customer.id,lines:[{itemId:f.item.id,quantity:3,rate:.01,tax:18,discount:0}]});
 for(let n=0;n<3;n++)f.run('credit',{sourceId:sale.id,note:'Fractional return',lines:[{itemId:f.item.id,quantity:1}]});
 const credits=f.state.businessRecords.filter(r=>r.kind==='credit');assert.equal(credits.reduce((n,r)=>n+r.amountPaise,0),sale.amountPaise);assert.equal(credits.flatMap(r=>r.lines).reduce((n,l)=>n+lineNet(l),0),lineNet(sale.lines[0]));assert.equal(ownedStock(f.state,f.item.id),3);assert.equal(returnableLines(f.state,sale)[0].quantity,0);
 assert.throws(()=>f.run('credit',{sourceId:sale.id,note:'Duplicate',lines:[{itemId:f.item.id,quantity:.001}]}),/quantity/);
 const cost=accountBalances(f.state).find(a=>a.account==='Cost of goods sold');assert.equal(cost.debit,cost.credit);
 assert.doesNotThrow(()=>validateBackup({schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()},'actual',bom));
});
test('Unpaid partial returns reduce debt, cap later receipts and leave money unchanged',()=>{
 const f=fixture();f.run('purchase',{partyId:f.supplier.id,lines:f.line()});const sale=f.run('sale',{partyId:f.customer.id,lines:f.line(3,20)});f.run('credit',{sourceId:sale.id,note:'Return one',lines:[{itemId:f.item.id,quantity:1}]});assert.equal(businessDue(f.state,sale),4720);assert.equal(refundDue(f.state,sale),0);assert.equal(cashBalance(f.state),0);
 assert.throws(()=>f.run('payment-in',{sourceId:sale.id,amount:47.21,method:'cash'}),/exceed/);f.run('payment-in',{sourceId:sale.id,amount:47.20,method:'cash'});assert.equal(businessDue(f.state,sale),0);
 assert.throws(()=>f.run('credit',{sourceId:sale.id,note:'Invalid',lines:[{itemId:f.item.id,quantity:1},{itemId:f.item.id,quantity:1}]}),/unreturned|once/);
});
test('Paid purchase returns post supplier refunds, conserve stock and balance the journal',()=>{
 const f=fixture();const bank=f.run('account',{data:{name:'Refund bank'},amount:100}),purchase=f.run('purchase',{partyId:f.supplier.id,lines:f.line(3,10)});f.run('payment-out',{sourceId:purchase.id,amount:35.40,method:'bank',accountId:bank.id});
 f.run('debit',{sourceId:purchase.id,note:'Return one',lines:[{itemId:f.item.id,quantity:1}]});assert.equal(refundDue(f.state,purchase),1180);assert.equal(ownedStock(f.state,f.item.id),2);
 f.run('purchase-refund',{sourceId:purchase.id,amount:11.80,method:'bank',accountId:bank.id,note:'Supplier transferred refund'});assert.equal(refundDue(f.state,purchase),0);assert.equal(businessDue(f.state,purchase),0);
 const balances=accountBalances(f.state),a=balances.find(a=>a.account==='Bank: Refund bank');assert.equal(a.debit-a.credit,7640);assert.equal(balances.find(a=>a.account==='Owned inventory').debit-balances.find(a=>a.account==='Owned inventory').credit,2000);assert.equal(journal(f.state).reduce((n,e)=>n+e.debit-e.credit,0),0);
 assert.doesNotThrow(()=>validateBackup({schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()},'actual',bom));
});
test('Return/refund dates, available stock, actual cash and stale writes remain enforced',async()=>{
 const f=fixture();const purchase=f.run('purchase',{partyId:f.supplier.id,lines:f.line(3,10)}),sale=f.run('sale',{partyId:f.customer.id,lines:f.line(3,20)});
 assert.throws(()=>f.run('debit',{sourceId:purchase.id,note:'Already sold',lines:[{itemId:f.item.id,quantity:1}]}),/stock/);
 assert.throws(()=>f.run('credit',{date:'2026-10-13',sourceId:sale.id,note:'Earlier',lines:[{itemId:f.item.id,quantity:1}]}),/predate/);
 f.run('payment-in',{sourceId:sale.id,amount:70.80,method:'cash'});f.run('credit',{date:'2026-10-15',sourceId:sale.id,note:'Tomorrow',lines:[{itemId:f.item.id,quantity:1}]});
 assert.throws(()=>f.run('sale-refund',{sourceId:sale.id,amount:23.60,method:'cash',note:'Too soon'}),/available/);
 f.run('expense',{amount:70.80,method:'cash',data:{name:'Courier',category:'Transport'}});assert.throws(()=>f.run('sale-refund',{date:'2026-10-15',sourceId:sale.id,amount:23.60,method:'cash',note:'No funds'}),/cash/);
 const store=createBrowserStore({bom,indexedDBFactory:new IDBFactory()});let w=await store.load('actual');const backup={schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()};const restored=await store.restore('actual',backup,w.state.revision);assert(restored.state.businessRecords.some(r=>r.kind==='credit'));
 await assert.rejects(store.save('actual','business-record',{kind:'credit',date:'2026-10-15',sourceId:sale.id,note:'Stale',lines:[{itemId:f.item.id,quantity:1}]},w.state.revision),/changed/);
});

test('Opening balances post without revenue or cash, settle partially, and survive validated backup',()=>{
 const f=fixture(),customer=f.customer.id,supplier=f.supplier.id;
 const receivable=f.run('opening-receivable',{partyId:customer,amount:75,note:'From old ledger'}),payable=f.run('opening-payable',{partyId:supplier,amount:30,note:'From old ledger'});
 assert.equal(cashBalance(f.state),0);assert.equal(accountBalances(f.state).some(a=>['income','expense'].includes(a.category)),false);
 assert.equal(accountBalances(f.state,'','2026-10-13').length,0);
 assert.throws(()=>f.run('opening-receivable',{partyId:customer,amount:100,note:'Duplicate'}),/already recorded/);
 assert.throws(()=>f.run('opening-payable',{partyId:customer,amount:100,note:'Wrong type'}),/Supplier/);
 f.run('party-credit',{partyId:customer,data:{enabled:'true',limit:'40'}});assert.equal(partyCredit(f.state,customer).exceeded,true);
 f.run('payment-in',{sourceId:receivable.id,amount:40,method:'cash'});f.run('payment-out',{sourceId:payable.id,amount:10,method:'cash'});
 assert.equal(businessDue(f.state,receivable),3500);assert.equal(businessDue(f.state,payable),2000);assert.equal(cashBalance(f.state),3000);assert.equal(partyCredit(f.state,customer).exceeded,false);
 assert.throws(()=>f.run('payment-out',{sourceId:payable.id,amount:21,method:'cash'}),/exceed/);
 assert.throws(()=>f.run('payment-in',{sourceId:payable.id,amount:1,method:'cash'}),/not found/);
 const balances=accountBalances(f.state);assert.equal(balances.reduce((n,a)=>n+a.debit-a.credit,0),0);
 const backup={schemaVersion:3,mode:'actual',bom,state:f.state,exportedAt:new Date().toISOString()};assert.doesNotThrow(()=>validateBackup(backup,'actual',bom));
});

test('Open refunds are shown separately from invoice debt at the reporting date',()=>{
 const f=fixture();const p=f.run('purchase',{partyId:f.supplier.id,lines:f.line(10)});
 f.run('cash-adjustment',{amount:118,method:'cash',data:{direction:'in'},note:'Opening'});f.run('payment-out',{sourceId:p.id,amount:118,method:'cash'});
 const s=f.run('sale',{partyId:f.customer.id,lines:f.line(2,20)});f.run('payment-in',{sourceId:s.id,amount:47.20,method:'cash'});
 f.run('credit',{sourceId:s.id,date:'2026-10-15',note:'Return one',lines:[{itemId:f.item.id,quantity:1}]});f.run('debit',{sourceId:p.id,date:'2026-10-15',note:'Return one',lines:[{itemId:f.item.id,quantity:1}]});
 assert.equal(accountBalances(f.state,'','2026-10-14').some(a=>a.account.includes('refunds')),false);
 const balances=accountBalances(f.state),net=name=>{const a=balances.find(a=>a.account===name);return a.debit-a.credit};
 assert.equal(net('Trade receivables'),0);assert.equal(net('Trade payables'),0);assert.equal(net('Customer refunds payable'),-2360);assert.equal(net('Supplier refunds receivable'),1180);
});

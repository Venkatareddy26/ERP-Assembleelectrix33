import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IDBFactory } from 'fake-indexeddb';
import { emptyState, execute, stock, today, seedDemo } from '../server/domain.mjs';
import { componentLedger, billPaid } from '../server/manufacturing.mjs';
import { parseBackup, isReadableState } from '../server/backup.mjs';
import { createBrowserStore } from '../src/lib/browser-store.mjs';
import { exportSheets } from '../server/export.mjs';

const bom={products:[{id:'P',name:'Assembly'}],materials:[{id:'M',name:'Spring',unit:'pcs'}],lines:[{productId:'P',materialId:'M',quantity:2}]};
function fixture(){
 let state=emptyState();const run=(action,input)=>{const result=execute(state,bom,action,{...input,recordedBy:'Operator'});state=result.state;return result.record};
 const customer=run('customer',{name:'Factory'}),worker=run('worker',{name:'Worker',type:'piece',rate:1});run('rate',{customerId:customer.id,productId:'P',rate:5});
 const order=run('order',{customerId:customer.id,productId:'P',quantity:10,due:today()});run('inward',{customerId:customer.id,materialId:'M',quantity:40,challan:'IN-1',date:today()});
 return {run,customer,worker,order,get state(){return state}};
}
const move=(f,type,quantity,reference='MOV-1')=>f.run('material-move',{customerId:f.customer.id,materialId:'M',type,quantity,reference,note:'Verified factory movement',date:today()});
function billed(f){const p=f.run('production',{orderId:f.order.id,workerId:f.worker.id,quantity:10,date:today()});f.run('qc',{productionId:p.id,accepted:9,rejected:1,note:'Finish defect'});f.run('dispatch',{orderId:f.order.id,quantity:9,challan:'OUT-1',date:today()});return f.run('invoice',{orderId:f.order.id,quantity:9,date:today()})}
const backup=f=>({bom,mode:'actual',schemaVersion:2,exportedAt:new Date().toISOString(),state:f.state});

test('Component returns and corrections reconcile with BOM consumption; QC never restores components',()=>{
 const f=fixture();billed(f);const snapshot=structuredClone(f.state.production);
 move(f,'return',5);move(f,'adjustment-in',3,'CORR-1');move(f,'adjustment-out',2,'CORR-2');
 assert.equal(stock(f.state,f.customer.id,'M'),16);assert.deepEqual(f.state.production,snapshot);
 const rows=componentLedger(f.state);assert.deepEqual(rows.map(row=>row.balance),[40,20,15,18,16]);assert.equal(rows[1].issued,20);assert.equal(rows.at(-1).actor,'Operator');
 assert.deepEqual(parseBackup(JSON.stringify(backup(f)),'actual',bom).state,f.state);
});
test('A return cannot borrow another customer stock, exceed stock, duplicate a reference, or omit a reason',()=>{
 const f=fixture();const other=f.run('customer',{name:'Other factory'});f.run('inward',{customerId:other.id,materialId:'M',quantity:1000,challan:'OTHER',date:today()});
 move(f,'return',40);const before=structuredClone(f.state);
 assert.throws(()=>move(f,'return',1,'MOV-2'),/Only 0/);assert.throws(()=>move(f,'adjustment-in',1),/already recorded/);
 assert.throws(()=>f.run('material-move',{customerId:f.customer.id,materialId:'M',quantity:1,type:'adjustment-in',reference:'NEW',note:'',date:today()}),/Reason/);
 assert.deepEqual(f.state,before);assert.equal(stock(f.state,other.id,'M'),1000);
 assert.throws(()=>f.run('production',{orderId:f.order.id,workerId:f.worker.id,quantity:1,date:today()}),/Insufficient customer stock/);
});
test('Ledger balances follow posting order when document dates are backdated',()=>{
 const f=fixture();f.run('material-move',{customerId:f.customer.id,materialId:'M',type:'return',quantity:2,reference:'BACKDATED',note:'Return documented earlier',date:'2026-01-01'});
 const rows=componentLedger(f.state);assert.equal(rows.at(-1).date,'2026-01-01');assert.equal(rows.at(-1).balance,38);
});
test('Bill receipts preserve billing snapshots and reject overpayment, duplicate receipts and pre-bill dates atomically',()=>{
 const f=fixture(),invoice=billed(f);const snapshot=structuredClone(invoice);
 f.run('payment',{invoiceId:invoice.id,amount:20,method:'upi',reference:'RCPT-1',date:today()});assert.equal(billPaid(f.state,invoice.id),2000);
 assert.throws(()=>f.run('payment',{invoiceId:invoice.id,amount:30,method:'cash',reference:'RCPT-2',date:today()}),/exceeds/);
 assert.throws(()=>f.run('payment',{invoiceId:invoice.id,amount:1,method:'cash',reference:'RCPT-1',date:today()}),/already/);
 assert.throws(()=>f.run('payment',{invoiceId:invoice.id,amount:1,method:'bank',reference:'OLD',date:'2020-01-01'}),/before/);
 f.run('payment',{invoiceId:invoice.id,amount:25,method:'bank',reference:'RCPT-2',date:today()});assert.equal(billPaid(f.state,invoice.id),4500);assert.deepEqual(f.state.invoices[0],snapshot);
 assert.deepEqual(parseBackup(JSON.stringify(backup(f)),'actual',bom).state,f.state);
});
test('Legacy backups remain readable; extended snapshots reject malformed or impossible material and payment ledgers',()=>{
 const f=fixture(),invoice=billed(f);const old=backup(f);old.schemaVersion=1;delete old.state.materialMoves;delete old.state.payments;
 assert.equal(parseBackup(JSON.stringify(old),'actual',bom).state.materialMoves,undefined);assert(isReadableState(old.state));
 assert(!isReadableState({...old.state,materialMoves:null}));
 move(f,'return',1);f.run('payment',{invoiceId:invoice.id,amount:1,method:'cash',reference:'R1',date:today()});
 for(const corrupt of [b=>b.state.materialMoves[0].quantity=9999,b=>b.state.materialMoves[0].type='unknown',b=>b.state.payments[0].amountPaise=999999,b=>b.state.payments[0].invoiceId='missing',b=>b.state.payments.push(structuredClone(b.state.payments[0]))]){const b=backup(f);const copy=structuredClone(b);corrupt(copy);assert.throws(()=>parseBackup(JSON.stringify(copy),'actual',bom),/incomplete or damaged/)}
});
test('Browser movements and bill receipts persist, reject concurrent overpayments, and round-trip JSON restore',async()=>{
 const imported=JSON.parse(readFileSync(new URL('../data/bom.json',import.meta.url),'utf8'));const indexedDBFactory=new IDBFactory();
 const store=createBrowserStore({bom:imported,indexedDBFactory}),second=createBrowserStore({bom:imported,indexedDBFactory});let {state}=await store.load('demo');const cid=state.customers[0].id,mid=imported.materials[0].id;
 state=(await store.save('demo','material-move',{customerId:cid,materialId:mid,type:'return',quantity:1,reference:'RETURN',note:'Return remaining component',date:today()},state.revision)).state;
 const invoice=state.invoices[0];const input={invoiceId:invoice.id,amount:invoice.amountPaise/100,method:'bank',reference:'PAID',date:today()};
 const outcomes=await Promise.allSettled([store.save('demo','payment',input,state.revision),second.save('demo','payment',input,state.revision)]);assert.equal(outcomes.filter(row=>row.status==='fulfilled').length,1);
 const loaded=await second.load('demo');assert.equal(loaded.state.materialMoves.length,1);assert.equal(loaded.state.payments.length,1);assert.equal((await store.load('actual')).state.customers.length,0);
 const restored=await store.restore('demo',{...loaded,schemaVersion:2,exportedAt:new Date().toISOString()},loaded.state.revision);assert.deepEqual(restored.state.payments,loaded.state.payments);assert.deepEqual(restored.state.materialMoves,loaded.state.materialMoves);
});
test('Exports reconcile component corrections, returns, running balances and bill receipts',()=>{
 const f=fixture(),invoice=billed(f);move(f,'return',5);move(f,'adjustment-in',2,'CORR');f.run('payment',{invoiceId:invoice.id,amount:10,method:'bank',reference:'R1',date:today()});
 const workspace={mode:'actual',bom,state:f.state};const inventory=exportSheets(workspace,'inventory');
 assert.equal(inventory[0].rows[0].Balance,17);assert.equal(inventory[0].rows[0].Returned,5);assert.equal(inventory[0].rows[0].Correction,2);assert.equal(inventory.find(row=>row.name==='Component ledger').rows.at(-1)['Running balance'],17);
 const billing=exportSheets(workspace,'billing');assert.equal(billing.find(row=>row.name==='Outstanding bills').rows[0]['Outstanding INR'],35);assert.equal(billing.find(row=>row.name==='Payment receipts').rows[0]['Received INR'],10);
});
test('Local SQLite API keeps legacy records, movements and receipts across restart and rejects stale writes',async()=>{
 const {spawn}=await import('node:child_process');const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const {once}=await import('node:events');const {DatabaseSync}=await import('node:sqlite');
 const directory=await mkdtemp(path.join(tmpdir(),'ae-manufacturing-test-'));let child;
 const legacy=emptyState();delete legacy.materialMoves;delete legacy.payments;
 const db=new DatabaseSync(path.join(directory,'actual.sqlite'));db.exec('CREATE TABLE workspace (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)');db.prepare('INSERT INTO workspace VALUES(1,?)').run(JSON.stringify(legacy));db.close();
 async function start(){child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0',FORGEFLOW_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('API did not start')),15000);child.once('exit',code=>{clearTimeout(timeout);reject(Error(`API exited ${code}`))});child.stdout.on('data',chunk=>{const match=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0])}})})}
 async function stop(){if(child){const ended=once(child,'exit');child.kill();await ended;child=undefined}}
 const load=async(base,mode='demo')=>(await fetch(base+'/api/workspace',{headers:{'x-workspace':mode}})).json();
 const post=(base,revision,action,input)=>fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','x-workspace':'demo'},body:JSON.stringify({revision,action,input})});
 try{
  let base=await start();assert.deepEqual((await load(base,'actual')).state,legacy);let w=await load(base);
  let response=await post(base,w.state.revision,'material-move',{customerId:w.state.customers[0].id,materialId:w.bom.materials[0].id,type:'return',quantity:1,reference:'LOCAL-RETURN',note:'Verified return',date:today()});assert.equal(response.status,200);w.state=(await response.json()).state;
  const revision=w.state.revision;response=await post(base,revision,'payment',{invoiceId:w.state.invoices[0].id,amount:1,method:'bank',reference:'LOCAL-RECEIPT',date:today()});assert.equal(response.status,200);
  assert.equal((await post(base,revision,'payment',{invoiceId:w.state.invoices[0].id,amount:1,method:'cash',reference:'STALE',date:today()})).status,409);
  await stop();base=await start();w=await load(base);assert.equal(w.state.materialMoves[0].reference,'LOCAL-RETURN');assert.equal(w.state.payments[0].amountPaise,100);assert.deepEqual((await load(base,'actual')).state,legacy);
 }finally{await stop();const resolved=path.resolve(directory);assert(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('ae-manufacturing-test-'));await rm(resolved,{recursive:true,force:true})}
});

import { randomUUID } from 'node:crypto';
export const emptyState = () => ({revision:0,customers:[],rates:[],workers:[],inwards:[],orders:[],production:[],dispatches:[],invoices:[],audit:[]});
const fail = message => {throw new Error(message);};
const id = () => randomUUID();
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function text(value,label){if(typeof value!=='string'||!value.trim()||value.length>250)fail(`${label} is required (up to 250 characters).`);return value.trim();}
function qty(value,label='Quantity'){const n=Number(value);if(!Number.isSafeInteger(n)||n<=0||n>10000000)fail(`${label} must be a whole number between 1 and 10,000,000.`);return n;}
function nonNegative(value,label){if(value===null||value===undefined||value==='')fail(`${label} is required.`);const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>10000000)fail(`${label} must be a non-negative whole number.`);return n;}
function money(value,label){if(value===null||value===undefined||value==='')fail(`${label} is required.`);const n=Number(value);if(!Number.isFinite(n)||n<=0||n>1000000||Math.abs(n*100-Math.round(n*100))>0.00001)fail(`${label} must be positive with at most 2 decimal places.`);return Math.round(n*100);}
function date(value){const v=text(value,'Date');if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Enter a valid date.');return v;}
function get(rows,key,label){return rows.find(r=>r.id===key)??fail(`${label} was not found. Refresh and try again.`);}
const total = (rows,key='quantity') => rows.reduce((n,r)=>n+r[key],0);
export function orderTotals(state,orderId){const p=state.production.filter(r=>r.orderId===orderId);return {produced:total(p),accepted:total(p,'accepted'),rejected:total(p,'rejected'),pending:total(p.filter(r=>!r.inspected)),dispatched:total(state.dispatches.filter(r=>r.orderId===orderId)),billed:total(state.invoices.filter(r=>r.orderId===orderId))};}
export function stock(state,customerId,materialId){return total(state.inwards.filter(r=>r.customerId===customerId&&r.materialId===materialId))-state.production.filter(p=>get(state.orders,p.orderId,'Order').customerId===customerId).reduce((n,p)=>n+p.consumption.filter(c=>c.materialId===materialId).reduce((a,c)=>a+c.quantity,0),0);}
export function plan(state,bom,customerId,productId,quantity){return bom.lines.filter(l=>l.productId===productId).map(l=>({...l,name:get(bom.materials,l.materialId,'Material').name,required:l.quantity*quantity,available:stock(state,customerId,l.materialId),shortage:Math.max(0,l.quantity*quantity-stock(state,customerId,l.materialId))}));}
export function execute(state,bom,action,input){
 const s=structuredClone(state); const b=input; const createdAt=new Date().toISOString(); let record;
 switch(action){
 case 'customer':{
  const name=text(b.name,'Customer name');if(s.customers.some(c=>c.name.toLowerCase()===name.toLowerCase()))fail('A customer with this name already exists.');
  record={id:id(),name,contact:typeof b.contact==='string'?b.contact.trim().slice(0,250):'',createdAt};s.customers.push(record);break;
 }
 case 'rate':{
  get(s.customers,b.customerId,'Customer');get(bom.products,b.productId,'Product');const ratePaise=money(b.rate,'Customer piece rate');
  record={id:id(),customerId:b.customerId,productId:b.productId,ratePaise,createdAt};s.rates=s.rates.filter(r=>!(r.customerId===b.customerId&&r.productId===b.productId));s.rates.push(record);break;
 }
 case 'worker':{
  if(!['piece','salary'].includes(b.type))fail('Select piece-rate or salaried compensation.');
  record={id:id(),name:text(b.name,'Worker name'),type:b.type,ratePaise:money(b.rate,b.type==='piece'?'Worker rate':'Monthly salary'),createdAt};s.workers.push(record);break;
 }
 case 'inward':{
  get(s.customers,b.customerId,'Customer');get(bom.materials,b.materialId,'Material');const challan=text(b.challan,'Customer challan');
  if(s.inwards.some(r=>r.customerId===b.customerId&&r.challan===challan&&r.materialId===b.materialId))fail('This material is already recorded for this customer challan. Use a distinct challan reference.');
  record={id:id(),customerId:b.customerId,materialId:b.materialId,quantity:qty(b.quantity),challan,date:date(b.date),createdAt};s.inwards.push(record);break;
 }
 case 'order':{
  get(s.customers,b.customerId,'Customer');get(bom.products,b.productId,'Product');
  const rate=s.rates.find(r=>r.customerId===b.customerId&&r.productId===b.productId);if(!rate)fail('Save a customer-specific piece rate for this product before creating the order.');
  record={id:id(),number:`JW-${String(s.orders.length+1).padStart(4,'0')}`,customerId:b.customerId,productId:b.productId,quantity:qty(b.quantity),ratePaise:rate.ratePaise,due:date(b.due),createdAt};s.orders.push(record);break;
 }
 case 'production':{
  const order=get(s.orders,b.orderId,'Order'), worker=get(s.workers,b.workerId,'Worker'), quantity=qty(b.quantity);
  const t=orderTotals(s,order.id);if(t.accepted+t.pending+quantity>order.quantity)fail(`Only ${order.quantity-t.accepted-t.pending} pieces remain to produce. Rejected pieces can be replaced after QC.`);
  const requirements=plan(s,bom,order.customerId,order.productId,quantity);if(!requirements.length)fail('This product has no usable BOM.');
  const missing=requirements.filter(r=>r.shortage>0);if(missing.length)fail(`Insufficient customer stock: ${missing[0].name} needs ${missing[0].required} pcs; available ${missing[0].available} pcs. Record material inward first.`);
  record={id:id(),orderId:order.id,workerId:worker.id,quantity,date:date(b.date),accepted:0,rejected:0,inspected:false,wageRatePaise:worker.type==='piece'?worker.ratePaise:0,consumption:requirements.map(r=>({materialId:r.materialId,quantity:r.required})),createdAt};s.production.push(record);break;
 }
 case 'qc':{
  record=get(s.production,b.productionId,'Production entry');if(record.inspected)fail('This entry has already passed final QC.');
  const accepted=nonNegative(b.accepted,'Accepted pieces'), rejected=nonNegative(b.rejected,'Rejected pieces');
  if(accepted+rejected!==record.quantity)fail(`Accepted + rejected must equal ${record.quantity} produced pieces.`);
  if(rejected>0&&!b.note?.trim())fail('Add a rejection reason so the factory can follow up.');
  record.accepted=accepted;record.rejected=rejected;record.inspected=true;record.note=typeof b.note==='string'?b.note.trim().slice(0,250):'';record.inspectedAt=createdAt;break;
 }
 case 'dispatch':{
  const order=get(s.orders,b.orderId,'Order'), t=orderTotals(s,order.id), quantity=qty(b.quantity);
  if(quantity>t.accepted-t.dispatched)fail(`Only ${t.accepted-t.dispatched} accepted pieces are available to dispatch.`);
  record={id:id(),number:`DC-${String(s.dispatches.length+1).padStart(4,'0')}`,orderId:order.id,quantity,challan:text(b.challan,'Dispatch challan'),date:date(b.date),createdAt};
  if(s.dispatches.some(d=>d.challan===record.challan))fail('This dispatch challan has already been recorded.');s.dispatches.push(record);break;
 }
 case 'invoice':{
  const order=get(s.orders,b.orderId,'Order'), t=orderTotals(s,order.id), quantity=qty(b.quantity);
  if(quantity>t.dispatched-t.billed)fail(`Only ${t.dispatched-t.billed} dispatched pieces remain unbilled.`);
  record={id:id(),number:`BILL-${String(s.invoices.length+1).padStart(4,'0')}`,orderId:order.id,quantity,ratePaise:order.ratePaise,amountPaise:quantity*order.ratePaise,date:date(b.date),createdAt};s.invoices.push(record);break;
 }
 default:fail('Unknown action.');
 }
 const actor=typeof b.recordedBy==='string'?b.recordedBy.trim().slice(0,250):'';
 s.revision++;s.audit.push({id:id(),action,recordId:record.id,createdAt,...(actor?{actor}:{})});return {state:s,record};
}
export function seedDemo(bom){
 let s=emptyState();const run=(action,b)=>{const result=execute(s,bom,action,b);s=result.state;return result.record;};
 const c=run('customer',{name:'Meridian Electricals',contact:'Illustrative customer'}),c2=run('customer',{name:'Vertex Components',contact:'Illustrative customer'});
 const workers=[run('worker',{name:'Ravi Teja',type:'piece',rate:1.2}),run('worker',{name:'Suresh Kumar',type:'piece',rate:1.1}),run('worker',{name:'Anitha Devi',type:'salary',rate:18000})];
 const products=bom.products.slice(0,4);
 for(const customer of [c,c2]){
  for(const [i,p] of products.entries())run('rate',{customerId:customer.id,productId:p.id,rate:4.5+i*0.75});
  for(const m of bom.materials)run('inward',{customerId:customer.id,materialId:m.id,quantity:90000,challan:customer.id===c.id?'DEMO-RM-101':'DEMO-RM-102',date:today()});
 }
 const dateOffset=n=>{const d=new Date(`${today()}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const orders=products.map((p,i)=>run('order',{customerId:i<3?c.id:c2.id,productId:p.id,quantity:[5000,4000,6000,3500][i],due:dateOffset(i+1)}));
 for(let i=0;i<7;i++){
  const p=run('production',{orderId:orders[0].id,workerId:workers[i%2].id,quantity:400+i*30,date:dateOffset(i-6)});
  run('qc',{productionId:p.id,accepted:p.quantity-5,rejected:5,note:'Sample: alignment check'});
 }
 for(let i=1;i<4;i++){
  const p=run('production',{orderId:orders[i].id,workerId:workers[i%3].id,quantity:600+i*100,date:today()});
  if(i!==2)run('qc',{productionId:p.id,accepted:p.quantity-10,rejected:10,note:'Sample: finishing check'});
 }
 run('dispatch',{orderId:orders[0].id,quantity:2500,challan:'DEMO-OUT-201',date:today()});
 run('invoice',{orderId:orders[0].id,quantity:2000,date:today()});
 return s;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePartyCredit, partyCredit } from '../server/party-credit.mjs';

const row=(kind,amountPaise,partyId='c',data={})=>({id:`${kind}-${amountPaise}`,kind,amountPaise,partyId,data});
const fixture=()=>({customers:[{id:'c'}],orders:[{id:'o',customerId:'c'},{id:'other',customerId:'other'}],invoices:[{id:'i',orderId:'o',amountPaise:10000},{id:'other',orderId:'other',amountPaise:99999}],payments:[{invoiceId:'i',amountPaise:3000},{invoiceId:'other',amountPaise:88888}],businessRecords:[{id:'s',kind:'supplier',data:{name:'Supplier'}}]});
test('Credit settings normalize customer or supplier, reject missing party, invalid enabled values and invalid amounts',()=>{
 const state=fixture();assert.deepEqual(normalizePartyCredit(state,{partyId:' c ',data:{enabled:'true',limit:'100.5'}}),{partyId:'c',data:{enabled:'true',limit:'100.50'}});
 assert.equal(normalizePartyCredit(state,{partyId:'s',data:{enabled:'false',limit:'0'}}).data.limit,'0.00');
 assert.equal(normalizePartyCredit(state,{partyId:'c',data:{enabled:'true',limit:'1000000'}}).data.limit,'1000000.00');
 for(const limit of ['-1','1.234','1e3','Infinity','', '1000000.01', 'NaN','0x20'])assert.throws(()=>normalizePartyCredit(state,{partyId:'c',data:{enabled:'true',limit}}),/Credit limit/);
 assert.throws(()=>normalizePartyCredit(state,{partyId:'missing',data:{enabled:'true',limit:'50'}}),/not found/);
 assert.throws(()=>normalizePartyCredit(state,{partyId:'c',data:{enabled:true,limit:'50'}}),/enabled/);
});
test('Customer balance combines core job-work bills, trading bills, collections, partial returns and paid refunds',()=>{
 const state=fixture();state.businessRecords.push(row('sale',5000),row('payment-in',2000),row('credit',4000),row('sale-refund',1000),row('sale',80000,'other'),row('party-credit',0,'c',{enabled:'true',limit:'50.00'}));
 assert.deepEqual(partyCredit(state,'c'),{enabled:true,limitPaise:5000,balancePaise:7000,exceeded:true,remainingPaise:-2000});
 state.businessRecords.push(row('party-credit',0,'c',{enabled:'false',limit:'50.00'}));assert.equal(partyCredit(state,'c').exceeded,false);assert.equal(partyCredit(state,'c').balancePaise,7000);
});
test('Supplier payable balance includes payouts, debit returns and refunds from supplier, without customer bills',()=>{
 const state=fixture();state.businessRecords.push(row('purchase',10000,'s'),row('payment-out',6000,'s'),row('debit',5000,'s'),row('purchase-refund',1000,'s'),row('party-credit',0,'s',{enabled:'true',limit:'0.00'}));
 assert.deepEqual(partyCredit(state,'s'),{enabled:true,limitPaise:0,balancePaise:0,exceeded:false,remainingPaise:0});
 state.businessRecords.push(row('debit',500,'s'));assert.equal(partyCredit(state,'s').balancePaise,-500);assert.equal(partyCredit(state,'s').exceeded,false);
 assert.equal(partyCredit(state,'missing').enabled,false);
});

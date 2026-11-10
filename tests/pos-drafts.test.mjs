import test from 'node:test';
import assert from 'node:assert/strict';
import { posDraftKey, readPosDrafts, writePosDrafts, validatePosDrafts } from '../src/lib/pos-drafts.ts';
const draft=()=>({id:'one',name:'Counter bill',parkedAt:'2026-10-14T09:00:00.000Z',date:'2026-10-14',partyId:'customer',method:'cash',account:'',received:'0',note:'',lines:[{itemId:'item',quantity:'1.125',rate:'20.50',discount:'10',tax:'18'}]});
function memory(){const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}}
test('parked bills persist separately in each workspace without modifying domain records',()=>{
 const storage=memory(),record=draft(),before=JSON.stringify(record);
 writePosDrafts(storage,'actual',[],[record]);
 assert.deepEqual(readPosDrafts(storage,'actual'),[record]);
 assert.deepEqual(readPosDrafts(storage,'demo'),[]);
 assert.equal(JSON.stringify(record),before);
 writePosDrafts(storage,'actual',[record],[{...record,name:'Renamed'}]);
 const current=readPosDrafts(storage,'actual');
 assert.equal(current[0].name,'Renamed');
 writePosDrafts(storage,'actual',current,[]);
 assert.deepEqual(readPosDrafts(storage,'actual'),[]);
});
test('invalid or oversized drafts never overwrite stored bills',()=>{
 const storage=memory(),good=draft();writePosDrafts(storage,'actual',[],[good]);
 const bad=[{...good,date:'2026-02-30'},{...good,received:'-1'},{...good,lines:[]},{...good,name:' '},{...good,lines:[{...good.lines[0],quantity:'0'}]},{...good,lines:[{...good.lines[0],tax:'101'}]},{...good,lines:[{...good.lines[0],rate:'1e5'}]},{...good,lines:[good.lines[0],good.lines[0]]}];
 for(const d of bad){assert.throws(()=>writePosDrafts(storage,'actual',[good],[d]));assert.deepEqual(readPosDrafts(storage,'actual'),[good])}
 assert.throws(()=>validatePosDrafts([good,good]));
 assert.throws(()=>validatePosDrafts(Array.from({length:21},(_,i)=>({...good,id:String(i)}))));
});
test('storage errors, unreadable data and concurrent changes preserve existing data',()=>{
 const storage=memory(),good=draft();writePosDrafts(storage,'actual',[],[good]);
 assert.throws(()=>writePosDrafts(storage,'actual',[],[]),/another tab/);
 assert.throws(()=>writePosDrafts({...storage,setItem(){throw new Error('Quota exceeded')}},'actual',[good],[]),/Quota/);
 assert.deepEqual(readPosDrafts(storage,'actual'),[good]);
 const raw='{broken';storage.setItem(posDraftKey('actual'),raw);
 assert.throws(()=>readPosDrafts(storage,'actual'),/could not be read/);
 assert.throws(()=>writePosDrafts(storage,'actual',[],[]));
 assert.equal(storage.getItem(posDraftKey('actual')),raw);
});

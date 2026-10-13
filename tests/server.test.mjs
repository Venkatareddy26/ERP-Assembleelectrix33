import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import ExcelJS from 'exceljs';
import { DatabaseSync } from 'node:sqlite';
import { loadErrorMessage } from '../server/backup.mjs';

test('API stores records across restart, isolates demo, and rejects stale writes',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'forgeflow-test-'));let processHandle;
 async function start(){processHandle=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'0',FORGEFLOW_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server failed to start')),15000);processHandle.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Server exited ${code}`));});processHandle.stdout.on('data',chunk=>{const match=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});});}
 async function stop(){const finished=once(processHandle,'exit');processHandle.kill();await finished;}
 const get=async(base,mode='actual')=>{const response=await fetch(base+'/api/workspace',{headers:{'x-workspace':mode}});assert.equal(response.status,200);return response.json();};
 try{
  let base=await start();const actual=await get(base);const demo=await get(base,'demo');assert.equal(actual.state.customers.length,0);assert.equal(demo.state.customers.length,2);
  const post=(revision,input)=>fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','x-workspace':'actual'},body:JSON.stringify({revision,action:'customer',input})});
  const response=await post(0,{name:'Persistent test customer'});assert.equal(response.status,200);assert.equal((await response.json()).state.customers.length,1);
  const stale=await post(0,{name:'Stale customer'});assert.equal(stale.status,409);assert.match((await stale.json()).error,/Records changed/);
  assert.equal((await get(base,'demo')).state.customers.length,2);
  const badOrigin=await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:'{}'});assert.equal(badOrigin.status,403);
  const download=await fetch(base+'/api/export?section=customers',{headers:{'x-workspace':'actual'}});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/actual-customers.*\.xlsx/);
  const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await download.arrayBuffer()));assert.equal(book.worksheets[0].getCell('A6').value,'Persistent test customer');assert.equal(book.worksheets[0].rowCount,6);
  const invalidExport=await fetch(base+'/api/export?section=unknown');assert.equal(invalidExport.status,400);
  const malformedPath=await fetch(base+'/%E0%A4');assert.equal(malformedPath.status,400);assert.equal((await get(base)).state.customers.length,1);
  const backup={...(await get(base)),schemaVersion:1,exportedAt:new Date().toISOString()};
  const updated=await post(backup.state.revision,{name:'Added after the backup'});assert.equal(updated.status,200);const beforeRestore=(await updated.json()).state;
  const restore=(snapshot,revision,extraHeaders={})=>fetch(base+'/api/restore',{method:'POST',headers:{'Content-Type':'application/json','x-workspace':'actual',...extraHeaders},body:JSON.stringify({backup:snapshot,revision})});
  const invalidBackup=structuredClone(backup);delete invalidBackup.state.workers;
  const invalidRestore=await restore(invalidBackup,beforeRestore.revision);assert.equal(invalidRestore.status,400);assert.deepEqual((await get(base)).state,beforeRestore);
  assert.equal((await restore(backup,beforeRestore.revision,{Origin:'https://example.com'})).status,403);
  assert.equal((await restore(backup,backup.state.revision)).status,409);
  assert.equal((await restore(backup,null)).status,409);
  const restoredResponse=await restore(backup,beforeRestore.revision);assert.equal(restoredResponse.status,200);const restored=await restoredResponse.json();
  assert.deepEqual(restored.state,{...backup.state,revision:beforeRestore.revision+1});
  assert.equal((await post(beforeRestore.revision,{name:'Open before restore'})).status,409);
  assert.deepEqual((await get(base,'demo')).state,demo.state);
  await stop();base=await start();assert.deepEqual((await get(base)).state,restored.state);await stop();processHandle=null;
  const database=new DatabaseSync(path.join(directory,'actual.sqlite'));database.prepare('UPDATE workspace SET payload=? WHERE id=1').run('broken JSON');database.close();
  base=await start();const unreadable=await fetch(base+'/api/workspace',{headers:{'x-workspace':'actual'}});assert.equal(unreadable.status,400);assert.equal((await unreadable.json()).error,loadErrorMessage);
  const recoveredResponse=await restore(backup,null);assert.equal(recoveredResponse.status,200);const recovered=await recoveredResponse.json();
  assert.deepEqual({...recovered.state,revision:backup.state.revision},backup.state);assert.ok(recovered.state.revision>restored.state.revision);
  assert.deepEqual((await get(base)).state,recovered.state);assert.equal((await restore(backup,null)).status,409);await stop();processHandle=null;
 }finally{if(processHandle&&!processHandle.killed)await stop();if(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep))await rm(directory,{recursive:true,force:true});}
});

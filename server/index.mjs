import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {emptyState,execute,seedDemo} from './domain.mjs';
import {buildWorkbook} from './export.mjs';
import {isReadableState,loadErrorMessage,restoredState,staleRestoreMessage,validateBackup} from './backup.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));const dataDirectory=process.env.FORGEFLOW_DATA_DIR||path.join(root,'data');mkdirSync(dataDirectory,{recursive:true});
const bom=JSON.parse(readFileSync(path.join(root,'data/bom.json'),'utf8'));
const databases={};
for(const mode of ['demo','actual']){
 const db=new DatabaseSync(path.join(dataDirectory,`${mode}.sqlite`));
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);');
 if(!db.prepare('SELECT payload FROM workspace WHERE id=1').get())db.prepare('INSERT INTO workspace VALUES(1,?)').run(JSON.stringify(mode==='demo'?seedDemo(bom):emptyState()));
 databases[mode]=db;
}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function savedState(db){
 let state;try{state=JSON.parse(db.prepare('SELECT payload FROM workspace WHERE id=1').get().payload);}catch{throw new Error(loadErrorMessage);}
 if(!isReadableState(state))throw new Error(loadErrorMessage);return state;
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')){
  const host=req.headers.host??'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)){send(res,403,{error:'Local access only.'});return;}
  const mode=req.headers['x-workspace']==='actual'?'actual':'demo',db=databases[mode];
  try{
   if(req.method==='GET'&&url.pathname==='/api/workspace'){send(res,200,{mode,bom,state:savedState(db)});return;}
   if(req.method==='GET'&&url.pathname==='/api/export'){
    const section=url.searchParams.get('section');
    const state=JSON.parse(db.prepare('SELECT payload FROM workspace WHERE id=1').get().payload);
    const buffer=await buildWorkbook({mode,bom,state},section,{month:url.searchParams.get('month'),productId:url.searchParams.get('productId')});
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="assemble-electrix-${mode}-${section}-${date}.xlsx"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(buffer);return;
   }
   if(req.method==='POST'&&['/api/action','/api/restore'].includes(url.pathname)){
    const origin=req.headers.origin;if(origin&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)){send(res,403,{error:'Origin not allowed.'});return;}
    if(!req.headers['content-type']?.startsWith('application/json')){send(res,415,{error:'Send JSON data.'});return;}
    const limit=url.pathname==='/api/restore'?50*1024*1024:2*1024*1024;
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>limit){send(res,413,{error:'Request is too large.'});return;}}
    const request=JSON.parse(raw);
    if(url.pathname==='/api/restore'){
     const backup=validateBackup(request.backup,mode,bom);
     db.exec('BEGIN IMMEDIATE');
     let state;
     try{
      let current;try{current=JSON.parse(db.prepare('SELECT payload FROM workspace WHERE id=1').get().payload);}catch{current=undefined;}
      state=restoredState(backup,current,request.revision);
      db.prepare('UPDATE workspace SET payload=? WHERE id=1').run(JSON.stringify(state));db.exec('COMMIT');
     }catch(error){db.exec('ROLLBACK');throw error;}
     send(res,200,{mode,bom,state});return;
    }
    const state=savedState(db);
    if(request.revision!==state.revision){send(res,409,{error:'Records changed in another window. Close this form, refresh, and try again.'});return;}
    const result=execute(state,bom,request.action,request.input);
    db.prepare('UPDATE workspace SET payload=? WHERE id=1').run(JSON.stringify(result.state));send(res,200,result);return;
   }
   send(res,404,{error:'Route not found.'});return;
  }catch(error){send(res,error.message===staleRestoreMessage?409:400,{error:error.message});return;}
 }
 let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');}catch{send(res,400,{error:'Invalid URL encoding.'});return;}
 const dist=path.join(root,'dist');
 const file=path.resolve(dist,relative);if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403);res.end();return;}
 const target=relative&&existsSync(file)&&path.extname(file)?file:path.join(dist,'index.html');
 if(!existsSync(target)){res.writeHead(404);res.end('Build the frontend with npm run build, or use npm run dev.');return;}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'};
 let contents;try{contents=readFileSync(target);}catch{send(res,404,{error:'File not found.'});return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(contents);
});
const port=Number(process.env.PORT??3000);server.listen(port,'127.0.0.1',()=>console.log(`Assemble Electrix local server: http://127.0.0.1:${server.address().port}`));
const stop=()=>{server.close();for(const db of Object.values(databases))db.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);

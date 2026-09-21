import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const inventory=JSON.parse(readFileSync('output/asset-inventory.json','utf8'));
const checkpoint='output/convex-assets-checkpoint.jsonl';
const uploaded=new Map(existsSync(checkpoint)?readFileSync(checkpoint,'utf8').trim().split('\n').filter(Boolean).map(x=>{const r=JSON.parse(x);return [r.hash,r]}):[]);
const unique=[...new Map(inventory.map(x=>[x.sha256,x])).values()];
function run(name,args){return JSON.parse(execFileSync('npx',['convex','run','--prod',name,JSON.stringify(args)],{encoding:'utf8',maxBuffer:5e6,stdio:['ignore','pipe','pipe']}));}
const pending=unique.filter(x=>!uploaded.has(x.sha256));
let done=unique.length-pending.length;
for(let offset=0;offset<pending.length;offset+=500){
 const batch=pending.slice(offset,offset+500);
 const urls=run('archiveAdmin:uploadUrls',{count:batch.length});
 let cursor=0;
 await Promise.all(Array.from({length:12},async()=>{
  while(cursor<batch.length){
   const i=cursor++;const file=batch[i];const bytes=readFileSync('public'+file.path);
   const ext=file.path.split('.').pop();const mime={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf',zip:'application/zip'}[ext]||'application/octet-stream';
   let result;
   for(let attempt=0;attempt<4;attempt++){
    try{const response=await fetch(urls[i],{method:'POST',headers:{'Content-Type':mime},body:bytes,signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);result=await response.json();break;}catch(error){if(attempt===3)throw error;await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
   }
   const record={hash:file.sha256,storageId:result.storageId};uploaded.set(record.hash,record);appendFileSync(checkpoint,JSON.stringify(record)+'\n');
  }
 }));
 done+=batch.length;console.log(`Uploaded ${done}/${unique.length} unique assets`);
}
const records=[...uploaded.values()];const urlMap=new Map();
for(let i=0;i<records.length;i+=1000){const batch=records.slice(i,i+1000);const urls=run('archiveAdmin:fileUrls',{ids:batch.map(x=>x.storageId)});batch.forEach((x,j)=>{if(!urls[j])throw Error('Missing storage object');urlMap.set(x.hash,urls[j]);});}
const mapping=Object.fromEntries(inventory.map(x=>[x.path,{url:urlMap.get(x.sha256),sha256:x.sha256,size:x.size}]));
writeFileSync('lib/convex-asset-map.json',JSON.stringify(mapping));console.log(`Mapped ${inventory.length} asset paths. Complete.`);

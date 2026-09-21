import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const aliases=JSON.parse(fs.readFileSync('lib/pdf-aliases.json','utf8'));
const assets=JSON.parse(fs.readFileSync('lib/convex-asset-map.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('output/asset-inventory.json','utf8'));
for(const file of inventory){
 assert.equal(assets[file.path]?.sha256,file.sha256,`Missing or incorrect asset: ${file.path}`);
 assert.equal(assets[file.path]?.size,file.size);
 const url=new URL(assets[file.path].url);
 assert.equal(url.origin,'https://dazzling-weasel-580.convex.cloud');
 assert.ok(url.pathname.startsWith('/api/storage/'));
}
for(const [source,target] of Object.entries(aliases)){
 assert.ok(fs.existsSync('public'+target),`Missing canonical PDF: ${target}`);
 assert.ok(!fs.existsSync('public'+source),`Duplicate still present: ${source}`);
 assert.ok(!aliases[target],`Alias chain: ${source}`);
}
let references=0;
function inspect(value){
 if(typeof value==='string'&&value.startsWith('/repeat-v2/assets/')){assert.ok(assets[value],`Unmapped image: ${value}`);references++;}
 else if(Array.isArray(value))value.forEach(inspect);
 else if(value&&typeof value==='object')Object.values(value).forEach(inspect);
}
for(const filename of fs.readdirSync('public/repeat-v2/papers'))if(filename.endsWith('.json'))inspect(JSON.parse(fs.readFileSync(path.join('public/repeat-v2/papers',filename),'utf8')));
if(process.env.CHECK_ORIGIN){
 const samples=[inventory[0],inventory.find(x=>x.path.endsWith('all-papers-and-solutions.pdf')),inventory.find(x=>x.path.endsWith('.zip'))];
 for(const sample of samples){
  const response=await fetch(new URL(sample.path,process.env.CHECK_ORIGIN));
  assert.equal(response.status,200,sample.path);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),sample.sha256,sample.path);
 }
}
console.log(`Storage checked: ${inventory.length} paths, ${Object.keys(aliases).length} PDF aliases, ${references} question image references.`);

import fs from 'node:fs';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import katex from 'katex';
const parser=unified().use(remarkParse).use(remarkMath);let count=0,math=0;const errors=[];
function walk(n,id){if(n.type==='math'||n.type==='inlineMath'){math++;try{katex.renderToString(n.value,{throwOnError:true,strict:false,displayMode:n.type==='math'});}catch(e){errors.push({id,value:n.value,error:e.message});}}for(const c of n.children??[])walk(c,id);}
const index=JSON.parse(fs.readFileSync('public/midsem/index.json'));
const ids=new Set();
for(const f of fs.readdirSync('public/midsem/papers').filter(f=>f.endsWith('.json'))){
 const p=JSON.parse(fs.readFileSync('public/midsem/papers/'+f));
 const fail=(error)=>errors.push({id:p.id,error});
 if(p.questions.reduce((s,q)=>s+q.marks,0)!==30)fail('Marks mismatch');
 if(p.questionCount!==p.questions.length)fail('Question count mismatch');
 if(p.mcqCount!==5||p.mcqMarks!==5||p.theoryMarks!==25)fail('Format metadata mismatch');
 if(p.questions.length<=5||p.questions.slice(5).reduce((s,q)=>s+q.marks,0)!==25)fail('Theory must total 25 marks');
 const entry=index.papers.find(item=>item.id===p.id);
 if(entry?.questionCount!==p.questionCount)fail('Index question count mismatch');
 const repeat=JSON.parse(fs.readFileSync('public/repeat-v2/papers/'+f));
 if(repeat.questions.length!==p.questions.length)fail('Repeat question count mismatch');
 for(const [i,q] of p.questions.entries()){
  count++;
  if(ids.has(q.id))fail('Duplicate question ID: '+q.id);
  ids.add(q.id);
  if(q.number!==String(i+1))fail('Question numbers must be sequential');
  if(i<5){
   if(q.type!=='mcq'||q.marks!==1)fail('First five questions must be one-mark MCQs');
   for(const label of ['A','B','C','D'])if(!q.markdown.includes('('+label+')'))fail('Missing MCQ option '+label+' in '+q.id);
   if(!/Correct option: \([ABCD]\)/.test(q.solution))fail('Missing MCQ answer key in '+q.id);
  }else if(q.type!=='theory'||!Number.isInteger(q.marks)||q.marks<=0)fail('Remaining questions must be marked theory questions');
  const linked=repeat.questions[i];
  if(!linked||['id','number','type','markdown','marks'].some(key=>linked[key]!==q[key])||linked.preparedSolution!==q.solution)fail('Repeat content mismatch for '+q.id);
  for(const key of ['markdown','solution'])walk(parser.parse(q[key]),q.id+':'+key);
 }
}
if(index.questionCount!==count)errors.push({error:'Total index question count mismatch'});
const savedIds=JSON.parse(fs.readFileSync('lib/midsem-question-ids.json'));
if(savedIds.length!==ids.size||savedIds.some(id=>!ids.has(id)))errors.push({error:'Practice question IDs mismatch'});
console.log(JSON.stringify({questions:count,expressions:math,errors},null,2));if(errors.length)process.exitCode=1;

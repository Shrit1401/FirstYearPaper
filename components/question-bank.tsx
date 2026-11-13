"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, ChevronDown, ExternalLink, Search, Timer } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { Bank, PracticeQuestion } from '@/lib/question-banks';

type TestQuestion = PracticeQuestion;
export function QuestionBank({ bank, tests = [] }: { bank: Bank | null; tests?: TestQuestion[] }) {
 const [query, setQuery] = useState('');
 const [year, setYear] = useState('all');
 const [difficulty, setDifficulty] = useState('all');
 const [mode, setMode] = useState<'bank' | 'tests'>('bank');
 const [test, setTest] = useState<string | null>(null);
 const years = useMemo(() => [...new Set(bank?.questions.map(q => q.year))].sort().reverse(), [bank]);
 const filtered = useMemo(() => bank?.questions.filter(q => (year === 'all' || q.year === year) && (difficulty === 'all' || q.difficulty === difficulty) && q.text.toLowerCase().includes(query.toLowerCase())) ?? [], [bank, query, year, difficulty]);
 if (!bank) return <section className="mt-5 rounded-[1.3rem] border border-border/60 bg-card/70 p-5" aria-label="Question Banks"><div className="flex items-center gap-3"><BookOpen className="size-5 text-violet-400" /><h2 className="text-sm font-semibold">Question Banks</h2></div><p className="mt-3 text-sm text-muted-foreground">The imported collection does not have a question bank for this subject yet.</p><Link href="/question-banks" className="mt-3 inline-block text-xs underline underline-offset-4">Browse available subjects</Link></section>;
 const testYears = [...new Set(tests.map(q => q.source_year))].sort().reverse();
 const testQuestions = tests.filter(q => q.source_year === test);
 const field = 'h-10 min-w-0 rounded-xl border border-border/60 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';
 return <section className="mt-5 overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70" aria-label="Question Banks">
  <details open>
   <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 focus-visible:outline-2 focus-visible:outline-ring sm:px-5">
    <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"><BookOpen className="size-5" /></span>
    <span className="flex-1"><span className="block text-sm font-semibold">Question Banks</span><span className="mt-0.5 block text-xs text-muted-foreground">{bank.questions.length} questions · {years.length} years · sourced from Fertig</span></span><ChevronDown className="size-4 text-muted-foreground" />
   </summary>
   <div className="border-t border-border/50 px-4 pb-5 sm:px-5">
    <div className="my-4 flex gap-1 rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Study mode">
     {(['bank','tests'] as const).map(m => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{m === 'bank' ? 'All questions' : 'Practice tests'}</button>)}
    </div>
    {mode === 'bank' ? <>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_130px_150px]">
      <label className="relative col-span-2 sm:col-span-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input aria-label="Search bank questions" placeholder="Search questions..." className={`${field} w-full pl-9`} value={query} onChange={e=>setQuery(e.target.value)} /></label>
      <select aria-label="Question year" className={field} value={year} onChange={e=>setYear(e.target.value)}><option value="all">All years</option>{years.map(y=><option key={y}>{y}</option>)}</select>
      <select aria-label="Question difficulty" className={field} value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="all">All difficulties</option>{['Easy','Medium','Hard'].map(d=><option key={d}>{d}</option>)}</select>
     </div>
     <p className="my-3 text-xs text-muted-foreground" aria-live="polite">{filtered.length} of {bank.questions.length} questions</p>
     <div className="space-y-2">{filtered.map((q,i)=><details key={q.id} className="group rounded-xl border border-border/50 bg-background/40 open:bg-background/70">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-3.5 focus-visible:outline-2 focus-visible:outline-ring"><span className="pt-0.5 text-xs tabular-nums text-muted-foreground">{String(i+1).padStart(2,'0')}</span><span className="min-w-0 flex-1"><span className="mb-2 flex gap-2 text-[10px]"><span className="rounded-md bg-muted px-1.5 py-0.5">{q.year}</span><span className={`rounded-md px-1.5 py-0.5 ${q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-500' : q.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-500'}`}>{q.difficulty}</span></span><span className="line-clamp-2 text-sm leading-6 group-open:hidden">{q.text}</span><span className="hidden whitespace-pre-wrap break-words text-sm leading-6 group-open:block">{q.text}</span></span><ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
      {q.images?.length ? <div className="grid gap-3 px-4 pb-4">{q.images.map((src, index) => <a key={src} href={src} target="_blank" rel="noreferrer" aria-label={`Open question diagram ${index + 1}`} className="overflow-hidden rounded-lg bg-white p-2"><Image src={src} alt={`Question diagram ${index + 1}`} width={1200} height={800} unoptimized className="h-auto max-h-[480px] w-auto max-w-full object-contain" /></a>)}</div> : null}
      {q.solution ? <details className="mx-4 mb-4 rounded-lg bg-muted/40 p-3"><summary className="cursor-pointer text-xs font-medium">View source solution</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{q.solution}</p></details> : null}
      {q.needsSource && <a href={bank.source} target="_blank" rel="noreferrer" className="mx-3.5 mb-3.5 flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Diagram unavailable at source · View original question<ExternalLink className="size-3 shrink-0" /></a>}
     </details>)}</div>
     {!filtered.length && <div className="py-10 text-center"><p className="text-sm">No matching questions</p><button className="mt-2 text-xs underline underline-offset-4" onClick={()=>{setQuery('');setYear('all');setDifficulty('all');}}>Clear filters</button></div>}
    </> : <div className="space-y-3">
     {!testYears.length && <p className="text-sm text-muted-foreground">Fertig has not connected a test for this subject yet.</p>}
     {testYears.map(y=><button key={y} onClick={()=>setTest(test === y ? null : y)} className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-4 text-left hover:bg-muted/40"><Timer className="size-5 text-violet-400" /><span className="flex-1"><span className="block text-sm font-medium">{y} practice collection</span><span className="text-xs text-muted-foreground">{tests.filter(q=>q.source_year===y).length} questions · {tests.filter(q=>q.source_year===y).reduce((a,q)=>a+q.timeinmin,0)} min</span></span><ChevronDown className="size-4" /></button>)}
     {testQuestions.map((q,i)=><article key={i} className="rounded-xl border border-border/50 p-4"><p className="mb-2 text-xs text-muted-foreground">Question {i+1} · {q.marks ?? "Unspecified"} marks · {q.chapter.join(', ')}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{q.text}</p>{q.missingImages && <p className="mt-3 text-xs text-muted-foreground">One diagram is unavailable in the source collection.</p>}{q.images?.map((src,index) => <a key={src} href={src} target="_blank" rel="noreferrer"><Image src={src} alt={`Test question diagram ${index+1}`} width={1200} height={800} unoptimized className="mt-3 h-auto max-h-[480px] w-auto max-w-full rounded-lg bg-white p-2 object-contain" /></a>)}</article>)}
     <a href="https://fertig-flax.vercel.app/tests_home.html?year=2" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border/60 p-4 text-sm hover:bg-muted/40"><span>Browse all original timed tests on Fertig</span><ExternalLink className="size-4" /></a>
    </div>}
    <a href={bank.source} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground underline underline-offset-4">Source: Fertig question bank<ExternalLink className="size-3" /></a>
   </div>
  </details>
 </section>;
}

export function SubjectQuestionBank({ title, bank, tests }: { title: string; bank: Bank | null; tests: PracticeQuestion[] }) {
 if (!bank) return null;
 return <Sheet>
  <SheetTrigger asChild><button className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"><span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"><BookOpen className="size-5" /></span><span className="flex-1"><span className="block text-sm font-semibold">Question Bank</span><span className="mt-1 block text-xs text-muted-foreground">{bank.questions.length} questions{tests.length ? ' · Practice tests' : ''}</span></span><span className="text-xs text-muted-foreground group-hover:text-foreground">Open</span></button></SheetTrigger>
  <SheetContent className="w-full gap-0 sm:max-w-2xl">
   <SheetHeader className="border-b border-border/50 px-5 py-5 pr-12"><SheetTitle>{title}</SheetTitle><SheetDescription>Question bank and practice questions for this subject.</SheetDescription></SheetHeader>
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6"><QuestionBank bank={bank} tests={tests}/></div>
  </SheetContent>
 </Sheet>;
}

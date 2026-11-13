import { notFound } from 'next/navigation';
import { PageShell } from '@/app/browse/browse-shell';
import { QuestionBank } from '@/components/question-bank';
import { questionBankCatalog, getOriginalTests } from '@/lib/question-banks';
export function generateStaticParams() {return questionBankCatalog.map(({slug})=>({subject:slug}));}
export default async function BankPage({params}:{params:Promise<{subject:string}>}) {
 const {subject}=await params;
 const entry=questionBankCatalog.find(b=>b.slug===subject);
 if(!entry)notFound();
 return <PageShell title={entry.title} subtitle="Year 2 · Question Banks" backHref="/question-banks" backLabel="Question Banks" crumbs={[{label:'Year 2',href:'/browse/Year%202'},{label:'Question Banks',href:'/question-banks'},{label:entry.title}]}><QuestionBank bank={entry.bank} tests={getOriginalTests(entry.title)}/></PageShell>;
}

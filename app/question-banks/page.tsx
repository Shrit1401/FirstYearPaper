import { PageShell, RowList } from '@/app/browse/browse-shell';
import { questionBankCatalog, getOriginalTests } from '@/lib/question-banks';
export default function QuestionBanksPage() {
 return <PageShell title="Question Banks" subtitle="Year 2 questions and practice tests, organised by subject." backHref="/browse/Year%202" backLabel="Year 2" crumbs={[{label:'Year 2',href:'/browse/Year%202'},{label:'Question Banks'}]}>
  <RowList items={questionBankCatalog.map(({slug,title,bank})=>({label:title,description:`${bank.questions.length} questions${getOriginalTests(title).length ? ` · ${getOriginalTests(title).length} test questions` : ''}`,href:`/question-banks/${slug}`}))}/>
 </PageShell>;
}

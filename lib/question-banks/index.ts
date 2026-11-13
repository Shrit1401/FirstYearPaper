import ds from './ds.json';
import dccn from './dccn.json';
import dsco from './dsco.json';
import dms from './dms.json';
import daa from './daa.json';
import ai from './ai.json';
import os from './os.json';
import dbs from './dbs.json';
import po from './po.json';
import dsTests from './ds-tests.json';
import dscoTests from './dsco-tests.json';
import dccnTests from './dccn-tests.json';
import daaTests from './daa-tests.json';
import aiTests from './ai-tests.json';
import osTests from './os-tests.json';
import dbsTests from './dbs-tests.json';
import poTests from './po-tests.json';
export type BankQuestion = { id: string; year: string; difficulty: string; text: string; hasImage: boolean; needsSource: boolean; images?: string[]; solution?: string };
export type Bank = { source: string; questions: BankQuestion[] };
export function getQuestionBank(title: string): Bank | null {
 const name = title.toLowerCase().replace(/[^a-z]/g, '');
 if (name === 'datastructures') return ds;
 if (name.includes('datacommunication') || name === 'computernetworks') return dccn;
 if (name.includes('digitalsystem') && name.includes('computerorg')) return dsco;
 if (name.includes('discretemath')) return dms;
 if (name.includes('designandanalysisofalgorithm') || name === 'algorithmdesignandanalysis') return daa;
 if (name.includes('artificialintelligence')) return ai;
 if (name.includes('operatingsystem')) return os;
 if (name.includes('databasesystem') || name.includes('databasemanagement')) return dbs;
 if (name.includes('probability') && name.includes('optimi')) return po;
 return null;
}
export type PracticeQuestion = { text: string; marks: number | null; timeinmin: number; source_year: string; chapter: string[]; images: string[]; missingImages: boolean };
export function getOriginalTests(title: string): PracticeQuestion[] {
 const bank = getQuestionBank(title);
 const pairs: [Bank, unknown[]][] = [[ds,dsTests],[dsco,dscoTests],[dccn,dccnTests],[daa,daaTests],[ai,aiTests],[os,osTests],[dbs,dbsTests],[po,poTests]];
 const raw = pairs.find(([candidate]) => candidate === bank)?.[1] ?? [];
 return raw.map(value => {
  const q = value as Record<string, unknown>;
  return {missingImages: Boolean(q.missingImages), text: String(q.text ?? ''), marks: typeof q.marks === 'number' ? q.marks : null, timeinmin: Number(q.timeinmin) || 0, source_year: String(q.source_year ?? 'Unknown'), chapter: Array.isArray(q.chapter) ? q.chapter.map(String) : [String(q.chapter ?? '')], images: Array.isArray(q.images) ? q.images.map(String) : []};
 });
}

export const questionBankCatalog = [
 {slug:'ds', title:'Data Structures', bank:ds},
 {slug:'dccn', title:'Data Communication and Computer Networks', bank:dccn},
 {slug:'dsco', title:'Digital Systems and Computer Organization', bank:dsco},
 {slug:'dms', title:'Discrete Mathematical Structures', bank:dms},
 {slug:'daa', title:'Design and Analysis of Algorithms', bank:daa},
 {slug:'ai', title:'Artificial Intelligence', bank:ai},
 {slug:'os', title:'Operating Systems', bank:os},
 {slug:'dbs', title:'Database Systems', bank:dbs},
 {slug:'po', title:'Probability and Optimization', bank:po},
];

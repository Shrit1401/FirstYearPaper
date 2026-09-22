/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');

function secondYearMidsems(root = process.cwd()) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/midsem/second-year-index.json'), 'utf8'));
  const branches = { CSE: { MIDSEM: { subjects: {} } }, ECE: { MIDSEM: { subjects: {} } } };
  for (const paper of catalog.papers) {
    const subjects = branches[paper.branch].MIDSEM.subjects;
    const bucket = subjects[paper.subjectCode] ??= { papers: [] };
    for (const file of paper.files) {
      bucket.papers.push({
        name: `${paper.subjectCode} ${paper.subject} ${paper.period} ${paper.examType} - ${file.label}.pdf`,
        href: file.href,
        community: true,
      });
    }
  }
  return { sems: { 'Semester 3': { branches } } };
}
module.exports = { secondYearMidsems };
if (require.main === module) {
  const filename = path.join(process.cwd(), 'lib/papers-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  manifest.years['Year 2'] = secondYearMidsems();
  fs.writeFileSync(filename, JSON.stringify(manifest, null, 2));
}

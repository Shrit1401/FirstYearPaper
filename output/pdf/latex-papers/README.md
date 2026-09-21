# CSE semester 3 practice papers

Ten question papers: five ensembles adapted from the existing Manipal regular and makeup papers, and five newly authored papers. Each is 30 marks, with a suggested duration of 90 minutes. All carry the requested literal labels `by paper.shrit.in` and `normal`.

Each paper starts with Questions 1-5 as MCQs, worth 1 mark each (5 marks total). All remaining questions are theory questions, worth 25 marks in total. Select one correct option per MCQ. The ensemble sets use newly authored MCQs adapted to selected topics; retained theory questions preserve their source references. `mcq_format.py` defines the format and answer keys.

The layout follows the supplied local Manipal source papers: centered examination and subject headings, a marks/duration line, a left question-number column and right marks column. These are independent practice papers. The source examinations were 50 marks and 180 minutes; this pack retains the earlier midsem practice scope, not an authenticated midsem blueprint. No separate Mahi or NIMS reference was identified, so no NIMS authorship or affiliation is claimed.

## Files and compilation

Each `.tex` compiles with XeLaTeX or Tectonic. Run from this folder, for example:

```
tectonic da-ensemble.tex
```

Keep `dms-graph.png` beside the ensemble DMS source. It is the original source graph; all other text and mathematics are typeset in LaTeX. Ten individual PDFs and two combined set PDFs are supplied, plus a combined ten-paper PDF. Combined files contain copies of the same ten papers, not additional papers.

`manifest.json` maps each ensemble question to its original source question. Source identifiers and repository-relative paths are documented in `sources.json`. Additional syllabus observations are in `source-and-syllabus-review.md` in the parent folder. `build.py` regenerates the LaTeX using the previous selection JSON and graph in the workspace. The `.tex` files are independently editable and portable.

## Scope and editorial review

- DA: modules 1-3 provisionally mapped; descriptive statistics, preparation and testing. Source material does not establish full module 2 coverage.
- DS: modules 1-2 provisionally mapped, plus stacks only from module 3.
- DCCN: modules 1-2 as previously checked against the Teams outline.
- DSCO: modules 1-4 and introductory memory operations. The exact module 5 cutoff remains provisional.
- DMS: lattices, Boolean algebra, combinatorics and graphs, provisionally mapped to modules 1-3. Actual paper header is MAT 2101 despite the older index naming MAT 2125.

Ensemble wording has been clarified where necessary. DA specifies skewness, quartile and test conventions and supplies critical values. DCCN supplies waveform conventions and a square-wave bit-rate assumption. Its ambiguous every-fifth-transmission ARQ scenario is replaced with an explicitly timed three-frame adaptation of the same source topic; it is not a verbatim reproduction. Stop-and-wait specifies inclusion of the final ACK. The updated format retains 30 marks per paper, split into 5 MCQ marks and 25 theory marks. The DMS ensemble divisibility-poset question carries 5 marks. Source course-outcome labels are omitted because the practice selection and mark distribution differ from the originals.

The original set contains newly written questions with explicit numerical inputs, conventions and mark totals. These are practice questions, not predictions. Matching answers for all 127 questions (50 MCQs and 77 theory questions) are included in `solutions/`. The user confirmed the existing Manipal papers as the reference. The updated attribution is `by paper.shrit.in`.

## Complete package

`all-papers-and-solutions.pdf` places each question paper immediately before its matching solutions, with PDF bookmarks. `solutions/all-10-solutions.pdf` contains answers only. Individual question papers remain available separately for practice. All PDFs have been rebuilt with the updated attribution.

To rebuild all sources, PDFs and web/Repeat content from the repository root:

```sh
python3 output/pdf/latex-papers/solutions/build_solutions.py
python3 output/pdf/latex-papers/compile.py
python3 output/pdf/latex-papers/solutions/compile_solutions.py
python3 scripts/package-midsem.py
python3 scripts/export-midsem-web.py
python3 scripts/link-midsem-repeat.py
node scripts/validate-midsem.mjs
python3 scripts/refresh-midsem-assets.py
node scripts/upload-convex-assets.mjs
```

The last command uploads changed binary assets and refreshes the local hosted-file map. Deploy the app separately to publish its updated catalog and file references. PDF links and scan filenames carry content versions to avoid serving an older cached paper.

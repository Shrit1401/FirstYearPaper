# Worked solutions

Ten companion solution documents cover all 127 numbered questions: 50 one-mark MCQs and 77 theory questions. Every paper begins with the five MCQ answers, followed by theory solutions matching its renumbered questions. Match each `*-solutions.pdf` to the question paper with the same base name in the parent folder.

Every question-paper and solution-page footer reads `by paper.shrit.in | normal`.

## Reading and editing

- `all-10-solutions.pdf`: all worked answers, with subject bookmarks.
- `set-a-ensemble-solutions.pdf`: solutions for the five assembled papers.
- `set-b-original-solutions.pdf`: solutions for the five original papers.
- Individual `.tex` files: editable LaTeX sources. Keep the `code` and `figures` folders alongside them.
- `code`: twelve C files and two Verilog modules used in the printed solutions.
- `figures`: vector PDF diagrams, plots and waveforms.
- `coverage.json`: exact solution labels per paper.
- `verification-results.json`: results of computational and C execution checks.

Compile an individual document from this folder with `tectonic da-ensemble-solutions.tex`, or run `python3 compile_solutions.py` for all documents and combined PDFs. The compiler script needs PyMuPDF. To regenerate source content, run `python3 build_solutions.py`. Figures can be regenerated with `python3 make_figures.py`, which uses NumPy and Matplotlib. Existing figure PDFs suffice for normal LaTeX compilation.

## Conventions and verification

The answers use the assumptions printed in the corresponding papers. They include calculations, reasoning, proofs, code and relevant diagrams. Equivalent correct methods are acceptable. They are independent solutions, not an official university marking scheme.

Fike permutation order uses the descending exchange-position convention and counts the original arrangement as permutation 1. The reference and intermediate swaps are included in DMS Set A, Question 9. Duplicate parentheses use the explicitly described redundant-pair convention. Programming examples state their input assumptions. The C sources compile with C11 and strict warnings; targeted executions cover dynamic allocation, list deletion/reversal, undo/redo, infix conversion and bracket handling. Verilog was reviewed as synthesizable code; an HDL simulator was not run.

The numerical checks recompute statistics, chi-square and replicated ANOVA values. Exhaustive checks cover logic functions, counters, permutation ranks and bounded counts. Independent Floyd-Warshall checks validate both Dijkstra answer vectors, and both CRC codewords produce zero syndrome.

The compiler checks attribution and missing-character warnings. Render the updated question and solution PDFs for layout review after rebuilding. The graph in the DMS ensemble question paper is interpreted as directed.

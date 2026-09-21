# Repeat 2.0 OCR coverage

Generated on 8 September 2026. The main MIT B.Tech first and second year catalog contains **624 papers, 1,871 pages, 9,037 questions, and 1,451 original figure or diagram regions**, preserving provenance for 1,029 source PDF paths. Exact file duplicates are merged by SHA-256; differently encoded copies can remain distinct.

All 624 papers have been processed: 622 through OpenAI vision transcription and two six-page biology papers through direct visual transcription from their scans after the API did not return usable output. There are no pending papers or unresolved processing failures. Original PDFs remain unchanged, and every exported page has an original page image.

The catalog marks 393 papers complete and 231 partial. These are transcription and uncertainty statuses, not a claim of independent verification. Partial papers retain notes about uncertain text, source quality, continuation boundaries, or figure association. Question confidence is 8,473 high, 295 medium, and 269 low; these are extraction assessments, not calibrated accuracy scores.

Question text uses Markdown and LaTeX, including matrices and chemical notation. Figures use original image regions rather than reconstructed drawings. Question bands and cross-page continuations retain the printed context; uncertain associations fall back to full source pages with explicit notes. Superseded, unreferenced generated crops were removed. Current generated image assets occupy 867,452,203 bytes.

The source audit examined 1,061 candidate paths representing 653 unique files. The main catalog excludes 13 ICAS B.Sc papers and four answer-only schemes, whose existing exports remain in the [supplemental index](../public/repeat-v2/supplemental-index.json). Twelve papers with printed later-year semesters are excluded from the requested scope. Five misfiled first or second year source paths were recovered using their printed headers. Answer schemes containing actual questions remain explicitly labelled.

Visual QA included an initial six-paper sample, targeted comparisons for 16 correction records across 15 papers, and complete direct transcription of the two biology copies. Corrections recovered missing matrices and code, repaired invisible symbol corruption, and corrected diagram associations. These checks were performed by Codex against page renders, without independent human review. The whole corpus has not been manually checked for semantic accuracy; unclear source content remains marked rather than invented.

Validation passed with no missing asset, source linkage, or structural errors. Across all 641 main and supplemental exports, 9,234 question records and 12,053 math expressions in question text and diagram captions passed KaTeX validation with chemistry support. The same check rejects unexpected control characters. Rendering validity does not establish mathematical or transcription correctness.

The main vision batch took about 13 minutes, followed by selective stronger-model review and source corrections. Saved API attempts record 8,086,108 input and 1,370,305 output tokens; earlier interrupted requests may also have been billed.

Reproduce with Python 3.13, the dependencies in `scripts/requirements-repeat-v2.txt`, and the Tesseract executable. Keep `OPENAI_API_KEY` server-side in `.env.local`.

```sh
python3 -m pip install -r scripts/requirements-repeat-v2.txt
npm run repeat:prepare
npm run repeat:ocr
npm run repeat:validate
```

The pipeline is resumable. `npm run repeat:finalize` reapplies saved transcriptions, source corrections, subject normalization, scope filtering, and asset cleanup without new API requests. Exact counts, exclusions, provenance, and limitations are available in [coverage.json](../public/repeat-v2/coverage.json).

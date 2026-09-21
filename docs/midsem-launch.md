# Papers and Repeat 2.0

Canonical site: https://paper.shrit.in. Do not switch to the plural domain.

## Free access

Anyone can open `/browse`, `/midsem`, all original scans, the ten Manipal-format question PDFs and their answer PDFs without an account. `/midsem` groups the papers by subject and opens PDFs in the same viewer as the original archive. Old `/midsem/[id]` links redirect to the matching row. LaTeX and combined-download controls are no longer listed in the student UI. Endsem Papers means an ensemble of existing questions; AI generated means newly authored content. Both sets have AI-authored solutions. These are unofficial practice papers.

The 48 original midsem archive PDFs are all present. They do not yet all have prepared worked solutions. Do not claim otherwise.

## Paid access

One-time ₹29 midsem pass: Repeat AI chat and the exam-practice interface, saved attempts, self-assessment, retry list, and timer. The midsem AI limit is 20 requests per day, resetting at midnight UTC. Existing full passes retain full-library access and their existing daily allowance.

The domain and existing infrastructure are reused. No hosting upgrade was purchased. Static prepared answers make no model calls. Live AI requests incur usage charges on the existing API account; Dodo processing fees apply to sales. Free access for readers does not mean zero operating costs at every traffic level.

## Dodo and Convex linking

In Dodo, switch to Live Mode, then Products. The product is `Repeat 2.0 Midsem Practice`, ID `pdt_0NnmmPgVXwaahh5owJuUn`, INR 2900 paise, one-time, tax inclusive, no discount, no purchasing-power adjustment, no pay-what-you-want.

The production backend is `dazzling-weasel-580`. The API key and webhook signing key are stored only in Convex environment variables. Never put them in NEXT_PUBLIC variables or source control.

Checkout creation attaches the signed-in account ID and records the checkout session. After payment, the return page verifies the payment directly with Dodo. The signed webhook is an independent confirmation path:

`https://dazzling-weasel-580.convex.site/dodo/webhook`

A confirmed payment must match a recorded checkout, account, configured midsem product, INR currency, and exact ₹29 total. It grants only `midsemPaid`, not the older full-library `isPaid` entitlement. Repeated notifications do not create additional access. Unrelated products do not grant a pass.

To operate the site: use `/midsem` for free downloads, `/repeat` to choose practice, and `/repeat/library` for the paid AI exam workspace. In the Dodo dashboard, use Transactions to inspect payment status; in Convex use the payments table to match the checkout and user. Never grant access solely from a browser return URL.

## Content updates

Edit the LaTeX sources under `output/pdf/latex-papers`, compile PDFs, run `python3 scripts/export-midsem-web.py`, then `node scripts/validate-midsem.mjs`. Rebuild archive topic counts with `python3 scripts/build-midsem-topics.py`.

The numerical/code verifier is `output/pdf/latex-papers/solutions/verify_solutions.py`. It checks applicable arithmetic, C samples and edge cases, digital logic truth tables, CRC, enumeration, shortest paths, and statistical calculations. Human review is still needed for interpretation-dependent explanations. AI chat answers are not pre-reviewed.

## File storage and deployment

Original PDF files stay on Vercel. `scripts/prepare-asset-storage.py` removes byte-identical copies, preserves them locally under `output/duplicate-pdfs`, and records their old URLs in `lib/pdf-aliases.json`. The proxy rewrites those URLs to a retained original. Do not delete the alias map. Restore the backup copies before rebuilding the original source manifest, then deduplicate again.

Repeat page images, diagrams, generated paper/solution PDFs, and the LaTeX ZIP are stored in production Convex file storage. Question JSON and the application code remain deployment inputs. `scripts/upload-convex-assets.mjs` imports only unique hashes, resumes from `output/convex-assets-checkpoint.jsonl`, and generates `lib/convex-asset-map.json`. Never deploy a partial map. Upload functions are internal administrator functions, unavailable to browser clients.

Set production Vercel `REPEAT_ASSET_BASE_URL=https://paper.shrit.in` so AI scan fetches use the public domain rather than a protected deployment URL.

The original public file URLs are preserved through `/api/archive`. Responses are public and cached at Vercel's CDN for 30 days, reducing repeat origin transfers. Files can be opened without login. Changing bytes at an existing URL requires a new deployment and cache invalidation, or preferably a new filename. Convex's free storage and transfer allowances are finite; no paid overage plan is enabled by this setup.

Before deployment, verify every asset inventory path appears in the map, check a downloaded file's SHA-256, and check old PDF aliases. Use `python3 scripts/prepare-vercel-release.py` to create a clean upload directory with explicit inputs. It physically omits Convex-backed binaries, credentials, and local backups, and refuses a release larger than 200 MB. This is safer than relying on CLI archive ignore behavior alone. Deploy from the printed directory with the existing project/team IDs and `--prod --skip-domain`, verify it, then promote it to `paper.shrit.in`.

## Live release: 17 September 2026

Deployment `dpl_9QawfB6jATNDKfQDfUdWuRJ6t5vT` is promoted to `https://paper.shrit.in`. Retained original PDFs: 165,322,791 bytes. Removed 512 duplicate PDF deployment copies, with all old URLs preserved. Convex: 9,853 unique objects, 788,542,882 bytes, serving 10,133 paths. All stored object hashes and sizes were compared with the local inventory. All 13,713 question image references resolve.

Validation passed: production build, TypeScript, lint, 37 automated tests, all 512 local PDF alias responses, public production paper/solution/ZIP hash checks, free prepared-answer response, unauthenticated AI chat rejection, and Vercel CDN cache HIT. No real Dodo payment was charged during validation. The 48 original midsem archives still do not all have prepared solutions; the ten new papers have 91 prepared answers.

The shared PDF viewer includes a Repeat 2.0 action on desktop and mobile. Generated question and answer PDFs select the same matching paper. Original PDFs are matched against the Repeat catalog and its source aliases. Unavailable papers and papers outside the midsem pass show an explanation instead of silently opening an unrelated paper.

PDF-first UI published on 17 September 2026 in deployment dpl_25YEdDvjiNpABdkXbcwPRW5xyDN8. Build and 42 tests passed. Public listing, separate question/answer PDF downloads and paper-specific Repeat route checked after promotion.

# Question Papers

A web app for MIT Bengaluru question papers, with a first- and second-year study workspace, original figures, LaTeX questions, and teacher explanations.

## Live Website

👉 https://paper.shrit.in/

## What this app does

- Organizes papers across streams like **Core stream**, **Common**, and **CS Stream**.
- Lets users browse by stream → subject → paper.
- Provides a global search page to quickly find papers by name, subject, or stream.
- Opens paper files directly from the `public/` folder in the browser.

## Tech stack

- **Next.js (App Router)**
- **React + TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui components**
- **Convex** for login (email + password via Convex Auth), profiles, reading history, and Repeat 2.0 access
- **Dodo Payments** for the one-time ₹39 Repeat 2.0 pass

## Papers on disk

`npm run manifest` indexes the MAHE archive under `public/authoritative` and merges the student-contributed folders `public/YEAR1`, `public/YEAR2`, and `public/YEAR3`. Community files that are byte-identical to an archive PDF are skipped; the rest appear under a "Student scans" semester for that year with a "Student scan" badge.

## Project structure

```text
app/                     # Routes and UI
	page.tsx               # Home page
	browse/                # Search + stream browsing routes

lib/
	papers.ts              # Paper helpers and access functions
	papers-manifest.json   # Generated manifest used by the app

public/
	Core stream/
	Common/
	CS Stream/
												# Actual PDF files live here

scripts/
	generate-papers-manifest.cjs  # Builds the manifest from public/
```

## Local development

### 1) Install dependencies

```bash
npm install
```

### 2) Generate manifest (optional, but recommended after content changes)

```bash
npm run manifest
```

### 3) Start Convex

```bash
npx convex dev
```

The first run creates a dev deployment and writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Then generate the auth signing keys once:

```bash
npm run convex:setup-auth
```

### 4) Run dev server

```bash
npm run dev
```

Open http://localhost:3000

## Accounts, payments, and Convex

Everything account-related lives in `convex/`:

- `auth.ts` configures Convex Auth with the Password provider. Sign-in and sign-up happen through `/auth`; the Next.js proxy (`proxy.ts`) keeps the session cookie fresh and redirects `/profile` when signed out.
- `users.ts` exposes the viewer profile (name, year, semester, `isPaid`) and profile updates.
- `tracking.ts` merges each device's reading history into the account when the profile page opens.
- `payments.ts`, `dodo.ts`, and `dodoWebhook.ts` handle the Repeat 2.0 pass. `dodo.createCheckout` opens a Dodo hosted checkout for the signed-in user with `metadata.userId`; Dodo calls `https://<deployment>.convex.site/dodo/webhook` on `payment.succeeded`, and the thank-you page also confirms the payment directly with Dodo so access is granted without waiting for the webhook. Both paths run the same idempotent `applyPayment` mutation.
- `access.ts` is what the solve API asks: signed in, paid, and under the daily solution cap.

Set these on the Convex deployment (`npx convex env set NAME=value`, add `--prod` for production):

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Public site origin used for checkout return URLs |
| `JWT_PRIVATE_KEY`, `JWKS` | Created by `npm run convex:setup-auth` |
| `DODO_PAYMENTS_API_KEY` | Dodo API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Signing secret of the Dodo webhook endpoint (`whsec_...`) |
| `DODO_PRODUCT_ID` | Dodo product priced at ₹39 |
| `DODO_ENVIRONMENT` | `test_mode` (default) or `live_mode` |

For production, run `npx convex deploy` (or `npx convex deploy --cmd "npm run build"` on Vercel) and point `NEXT_PUBLIC_CONVEX_URL` at the production deployment.

PostHog and Seline are off during local development so optional analytics cannot interrupt previews or record test traffic. Set `NEXT_PUBLIC_ENABLE_ANALYTICS=true` to test them locally. Production keeps analytics enabled; PostHog also requires `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`. Missing PostHog settings do not prevent the app from starting.

## Repeat 2.0

Open `/repeat` for the first- and second-year question library. The whole workspace needs the one-time ₹39 pass, which is tied to the account and enforced on the server: the catalog, paper, and solve APIs return 401 when signed out and 402 without a pass. The minimal dark workspace shows one question on the left and its solution on the right, with orange accents for actions. Open **Subjects** to choose an academic year, branch, and subject, then select a paper by its exam year and type. Navigate with the arrow buttons or choose a question from the question-number menu. Questions render with KaTeX; figures retain their original scan pixels. **Original scan** opens the source question region, transcription notes, and a link to its PDF page.

**Solve question** opens a streamed teacher explanation. Follow-ups keep the selected question and its source images in context. Solutions support LaTeX, tables, and code. The server prompt lives in `lib/repeat-v2-solve.ts`. Transcriptions with uncertain symbols include review notes and access to the original scan.

### OpenAI setup

Set `OPENAI_API_KEY` in the ignored `.env.local` file for development, or in the deployment's server environment. Never use a `NEXT_PUBLIC_` variable for this key. The default teacher model is `gpt-5.4-mini`; override it with `REPEAT_SOLVE_MODEL`.

The teacher sends the selected question's original images to OpenAI using the Responses API with `store: false` and high reasoning effort (override with `REPEAT_SOLVE_REASONING`). The prompt treats the scan as the authority over the transcription, forbids invented values, and requires a shown check before the final answer; the tutor panel links to the original scan next to every solution. It never accepts a client-supplied image URL or API key. Each IP can request eight solutions per minute and each account 150 solutions per day. Configured Upstash credentials provide a shared counter; local development can fall back to a process-local counter if Redis is unavailable.

### Question data and OCR

The portable question bank is under `public/repeat-v2/`:

- `index.json`: filterable paper metadata, source memberships, and coverage counts.
- `papers/<id>.json`: individual questions, Markdown/LaTeX, marks, page references, confidence, and figures.
- `assets/<id>/`: original rendered pages and question/figure crops.
- `coverage.json`: processing totals, confidence counts, source exclusions, and limitations.
- `supplemental-index.json`: preserved ICAS papers and answer-only schemes outside the main MIT question library.

See [the OCR report](docs/REPEAT_OCR_REPORT.md) for the completed archive coverage, source checks, and remaining review flags. Reviewed transcription corrections and the two directly transcribed biology papers are preserved in `scripts/repeat-v2-corrections.json` and `scripts/repeat-v2-biology-manual.json` so exports can be rebuilt.

`scripts/build-repeat-v2.py` deduplicates matching PDFs, checks printed semester headers, and retains their source memberships. Its offline pass extracts PDF text or uses Tesseract for scans, retaining source images for every question. The vision pass reads the original pages, transcribes actual LaTeX, and separates questions and subparts. It uses `OPENAI_API_KEY` and makes billable API calls. Model checkpoints in ignored `generated/repeat-v2/` let interrupted jobs resume without repaying for finished papers.

```bash
python3 -m pip install -r scripts/requirements-repeat-v2.txt
brew install tesseract
python3 scripts/build-repeat-v2.py prepare --concurrency 6
python3 scripts/build-repeat-v2.py vision --concurrency 8
python3 scripts/finalize-repeat-v2.py
python3 scripts/build-repeat-v2.py validate
node scripts/validate-repeat-v2-math.mjs
```

Use `--paper <id>` to reprocess one paper, `--limit <n>` for a sample, and `--force` only when intentionally replacing cached extraction. Check `generated/repeat-v2/vision-report.json`, `validation.json`, and `math-validation.json` for failures. Passing structural and LaTeX checks does not establish that every transcription is semantically perfect; preserve and consult the original scans.

### Deployment

.vercelignore excludes local presentation files, video, agent scratch work, OCR intermediates, and backups from CLI uploads. All public papers and scan URLs remain available.

To reduce scan storage without changing any decoded pixels or dimensions, install `jpegtran` (`brew install jpeg-turbo`) and run `npm run repeat:optimize` for a dry run, then `npm run repeat:optimize -- --apply`. This requires the Pillow dependency from the OCR requirements. The optimizer verifies every image, replaces only smaller JPEGs, and preserves original bytes under ignored `generated/repeat-v2/storage-backups/`. Run it again after regenerating OCR exports. Each run writes a storage report and per-file journal under `generated/repeat-v2/`.

Deploy `public/repeat-v2/` along with the app. Vercel functions include the JSON question bank and fetch source images from the deployment's static assets, keeping the image archive out of the function bundle. If those assets are hosted separately, set `REPEAT_ASSET_BASE_URL` to their trusted HTTPS origin. Self-hosted Node deployments read images from the local `public/repeat-v2/assets/` directory by default; optionally set `REPEAT_LOCAL_ASSET_ROOT` to another relative or absolute directory. Local file reads check that resolved images remain inside this archive. Configure `OPENAI_API_KEY` and working Upstash credentials in the production environment. When configured Redis is unavailable, production rejects solution requests with a temporary service error. Development uses the same eight-per-minute limit in memory and retries Redis after one minute.

The interface uses the existing shadcn/ui components and the installed `emilkowalski/skill` design guidance, with short interaction transitions and reduced-motion support.

## Available scripts

- `npm run dev`: start the local dev server.
- `npm run build`: build for production.
- `npm run start`: run the production server.
- `npm run lint`: run ESLint.
- `npm run manifest`: regenerate `lib/papers-manifest.json` from `public/`.
- `npm run repeat:prepare`: extract source text and images.
- `npm run repeat:ocr`: run resumable vision transcription and finalize the library.
- `npm run repeat:finalize`: apply reviewed corrections and refresh the library metadata.
- `npm run repeat:optimize`: preview lossless scan storage savings; pass `-- --apply` to apply them with recoverable backups.
- `npm run repeat:validate`: verify source references and KaTeX rendering.

## Adding or updating papers

1. Add PDF files under the appropriate stream/subject folders inside `public/`.
2. Run:

   ```bash
   npm run manifest
   ```

3. Restart dev server if needed and verify on `/browse`.

> Notes:
>
> - Only `.pdf` files are indexed.
> - `solutions` and `output` directories are ignored while generating the manifest.

## Source / credits

Paper resources referenced by this project are connected to Manipal OSF materials and associated shared drive sources.

# Question Papers

A clean, fast web app to browse first-year MIT Bengaluru question papers (mid-sem and end-sem) by stream, subject, and searchable paper titles.

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

### 3) Run dev server

```bash
npm run dev
```

Open http://localhost:3000

## Available scripts

- `npm run dev` — start local dev server.
- `npm run build` — regenerate manifest, then build for production.
- `npm run start` — run production server.
- `npm run lint` — run ESLint.
- `npm run manifest` — regenerate `lib/papers-manifest.json` from `public/`.

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

---

If you'd like, I can also add screenshots and a small “Contributing” section to this README.

# Contributing

Smart PDF Tagger is currently a web-only React/Vite app. Keep changes focused on the browser app until Electron is reintroduced from a clean baseline.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`GEMINI_API_KEY` is optional. The app runs without it, but AI auto-labeling will return a fallback error.

## Quality Checks

Run these before opening a pull request:

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm audit --audit-level=moderate
```

`npm run test:browser` uses Playwright with Chrome and loads a PDF from `Downloads`. Set `SMART_PDF_TEST_FILE` to a specific PDF path for deterministic local runs.

## Repo Hygiene

- Do not commit `.env.local`, `node_modules`, `dist`, `test-results`, or Playwright reports.
- Keep project JSON/PDF fixtures out of the repo unless they are deliberately sanitized test fixtures.
- Prefer focused unit tests for utilities and browser tests for PDF viewer workflows.
- Keep UI changes consistent with the existing compact, work-focused design.

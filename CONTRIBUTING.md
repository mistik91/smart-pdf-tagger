# Contributing

Smart PDF Tagger is a React/Vite app with a conservative Electron desktop shell. Keep the browser workflow healthy first, then verify the desktop bridge when file open/save behavior changes.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`GEMINI_API_KEY` is optional. The app runs without it, but AI auto-labeling will return a fallback error.

For the desktop shell:

```bash
npm run electron:dev
```

`npm run electron:pack` and `npm run electron:dist` write to a temporary `smart-pdf-tagger-release` folder by default. Set `ELECTRON_BUILDER_OUTPUT` when you deliberately want a different output path.

## Quality Checks

Run these before opening a pull request:

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm run test:electron
npm audit --audit-level=moderate
```

`npm run test:browser` uses Playwright with Chrome and loads a PDF from `Downloads`. Set `SMART_PDF_TEST_FILE` to a specific PDF path for deterministic local runs.

`npm run test:electron` builds the renderer and Electron files, launches the app with Playwright, verifies the preload API, and checks project-save IPC.

## Repo Hygiene

- Do not commit `.env.local`, `node_modules`, `dist`, `dist-electron`, `release`, `desktop-pack-test`, `test-results`, or Playwright reports.
- Keep project JSON/PDF fixtures out of the repo unless they are deliberately sanitized test fixtures.
- Prefer focused unit tests for utilities and browser tests for PDF viewer workflows.
- Prefer Electron tests for native desktop bridge behavior instead of adding Node or Electron assumptions to renderer unit tests.
- Keep UI changes consistent with the existing compact, work-focused design.

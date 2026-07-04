# Smart PDF Tagger

Smart PDF Tagger is a browser-based React app for marking regions in PDF files, naming those regions, assigning colors and tags, and exporting the result as project JSON, CSV, or an annotated PDF.

The project is intentionally **web-only** right now. Electron packaging was removed so the app can stabilize first; desktop packaging can be reintroduced later from a clean baseline.

## Features

- Load a PDF and create a self-contained project.
- Draw, move, resize, edit, delete, copy, paste, undo, and redo annotation boxes.
- Add labels, descriptions, tags, colors, and visible comment indicators.
- Configure duplicate-label behavior: block project-wide duplicates, block same-page duplicates, warn only, or allow duplicates.
- Batch edit selected regions from the sidebar.
- Search, filter by color/tag, and sort annotations by page, label, color, or update date.
- Store project metadata: client, document type, status, and reviewer.
- Save and reopen project JSON files with validation for invalid imports.
- Use Save As to download a new project JSON without overwriting the current file handle.
- Manage PDF versions, copy tags into new versions, compare/sync versions, and rename versions.
- Apply, edit, import, and export reusable tag template schemas.
- Export annotations to CSV with selectable fields.
- Export annotated PDFs with configurable labels, comments, and colors.
- Use Browser Storage for local project persistence.
- Optionally use Gemini to suggest labels for selected PDF regions.
- Use OneDrive for account-backed project storage when configured.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- PDF.js for rendering
- pdf-lib for PDF export
- Vitest and Testing Library for unit/smoke tests
- Playwright for real-browser PDF workflow tests

## Requirements

- Node.js
- npm
- Google Chrome for `npm run test:browser`
- Optional: a Gemini API key for AI auto-labeling

## Setup

```bash
npm install
cp .env.example .env.local
```

Then edit `.env.local` if you want AI auto-labeling:

```bash
GEMINI_API_KEY=your_api_key_here
```

The app still runs without a Gemini key.

## Development

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:3000
```

## Quality Checks

Run the full pre-upload check set:

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm audit --audit-level=moderate
```

`npm run test:browser` uses Playwright and looks for a PDF in the Downloads folder. To use a deterministic fixture:

```bash
$env:SMART_PDF_TEST_FILE="E:\Downloads\your-file.pdf"
npm run test:browser
```

## Project Structure

```text
assets/          Static visual assets
components/      React UI components
e2e/             Playwright browser workflow tests
hooks/           React state/model hooks
services/        PDF export, cloud, and AI service adapters
test/            Vitest setup
utils/           Pure helpers and unit-tested business logic
```

## Browser Test Coverage

The Playwright suite exercises real PDF workflows:

- PDF upload and canvas rendering
- region drawing and resize handles
- labels, comments, tags, and visible sidebar state
- export options
- Save As prompt and JSON download
- keyboard shortcuts modal
- metadata and duplicate-rule settings
- template import/export and template application
- CSV download content
- new PDF version upload with copied tags
- version renaming
- duplicate-label blocking
- friendly errors for invalid project/template JSON imports

## GitHub Upload Checklist

1. Run the full quality checks above.
2. Confirm `.env.local`, `node_modules`, `dist`, `test-results`, and Playwright reports are not staged.
3. Initialize git if needed:

```bash
git init
git add .
git status
git commit -m "Initial web app baseline"
```

4. Create an empty GitHub repository.
5. Add the remote and push:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Notes

- Project files embed PDF data as base64, so large PDFs produce large JSON files.
- Browser Storage uses the current browser profile and is limited by browser storage quota.
- OneDrive depends on a valid Microsoft app registration and redirect URI.
- Gemini labeling requires network access and a configured API key.
- Template fields are edited in Settings and saved in browser localStorage.
- No Electron files are currently part of the app.

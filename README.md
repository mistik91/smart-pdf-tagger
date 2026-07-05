# Smart PDF Tagger

Smart PDF Tagger is a React app for marking regions in PDF files, naming those regions, assigning colors and tags, and exporting the result as project JSON, CSV, or an annotated PDF.

The app runs in the browser during normal development and also has a conservative Electron desktop shell for native project open, save, and Save As dialogs.

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
- Run as a desktop app with native project open, save, and Save As dialogs.
- Optionally use Gemini to suggest labels for selected PDF regions.
- Use OneDrive for account-backed project storage when configured.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- PDF.js for rendering
- pdf-lib for PDF export
- Electron and electron-builder for the desktop shell
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

## Desktop App

Build the web app, compile the Electron main/preload files, and open the desktop app:

```bash
npm run electron:dev
```

Create an unpacked local desktop build:

```bash
npm run electron:pack
```

Create a distributable installer package:

```bash
npm run electron:dist
```

Desktop package output defaults to a temporary `smart-pdf-tagger-release` folder so Windows-controlled workspace folders do not block Electron Builder's final rename step. Set `ELECTRON_BUILDER_OUTPUT` to choose another output folder:

```bash
$env:ELECTRON_BUILDER_OUTPUT="E:\Documents\Codex\smart-pdf-tagger\release"
npm run electron:pack
```

## Quality Checks

Run the full pre-upload check set:

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm run test:electron
npm audit --audit-level=moderate
```

`npm run test:browser` uses Playwright and looks for a PDF in the Downloads folder. To use a deterministic fixture:

```bash
$env:SMART_PDF_TEST_FILE="E:\Downloads\your-file.pdf"
npm run test:browser
```

`npm run test:electron` builds the app, launches Electron with Playwright, verifies the preload bridge, and checks native project-save IPC without exposing Node.js to the renderer.

## Project Structure

```text
assets/          Static visual assets
components/      React UI components
e2e/             Playwright browser workflow tests
e2e-electron/    Playwright Electron smoke tests
electron/        Electron main process and preload bridge
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

## Electron Design

- `electron/main.ts` owns the desktop window and native file dialogs.
- `electron/preload.cts` exposes a narrow `window.electronAPI` bridge for project open, save, and Save As.
- The React renderer detects the bridge and falls back to browser downloads/uploads when it is not present.
- The desktop window keeps `contextIsolation` enabled and `nodeIntegration` disabled.
- External links are handed to the operating system shell instead of opening inside the app window.

## GitHub Upload Checklist

1. Run the full quality checks above, including `npm run test:electron`.
2. Confirm `.env.local`, `node_modules`, `dist`, `dist-electron`, `release`, `desktop-pack-test`, `test-results`, and Playwright reports are not staged.
3. Initialize git if needed:

```bash
git init
git add .
git status
git commit -m "Initial app baseline"
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
- `dist-electron/`, `release/`, and temporary desktop package outputs are generated build outputs and should stay uncommitted.

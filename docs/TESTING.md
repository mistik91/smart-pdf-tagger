# Testing

Smart PDF Tagger uses a small set of commands that cover unit behavior, production builds, browser workflows, desktop workflows, and dependency health.

## Full Verification

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm run test:electron
npm audit --audit-level=moderate
```

## Commands

| Command | Coverage |
| --- | --- |
| `npm run test` | Vitest unit and smoke tests. |
| `npm run typecheck` | TypeScript project type checking. |
| `npm run build` | Production Vite build. |
| `npm run test:browser` | Playwright workflows in Chrome against the PDF viewer. |
| `npm run test:electron` | Electron launch, preload bridge, renderer isolation, and project-save IPC. |
| `npm audit --audit-level=moderate` | Dependency vulnerability audit. |

## Browser Workflow Tests

The browser suite covers:

- PDF upload and canvas rendering.
- Continuous-scroll multipage viewing, single-page navigation controls, page navigator counts, page clamping, keyboard page changes, and page-scoped annotations.
- Region drawing and resize handles.
- Labels, comments, tags, colors, and visible sidebar state.
- Export options and CSV download content.
- Save As prompt and JSON download.
- Keyboard shortcuts modal.
- Metadata and duplicate-rule settings.
- Template import/export and template application.
- PDF version upload, copied tags, and version renaming.
- Friendly errors for invalid project/template JSON imports.

By default, the browser test looks for a PDF in the Downloads folder. For deterministic local runs:

```powershell
$env:SMART_PDF_TEST_FILE="E:\Downloads\your-file.pdf"
npm run test:browser
```

## Electron Tests

`npm run test:electron` builds the renderer, compiles the Electron files, launches the shell with Playwright, and verifies:

- The app window starts.
- `window.electronAPI` exposes the expected project methods.
- Node.js `require` is not available in the renderer.
- Project-save IPC can write a JSON file.

## Release Smoke Test

After `npm run electron:dist`, smoke-test the unpacked executable from the release output folder before publishing the installer. The published release should be backed by both the automated test matrix and a packaged-app launch check.

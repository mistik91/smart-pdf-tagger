# Architecture

Smart PDF Tagger is built around a browser-first React renderer with a small Electron shell for native desktop file workflows.

## Runtime Surfaces

| Surface | Entry point | Purpose |
| --- | --- | --- |
| Browser app | `index.tsx` | Main annotation experience during development and web-style usage. |
| Electron main process | `electron/main.ts` | Desktop window, native open/save dialogs, and external-link handling. |
| Electron preload | `electron/preload.cts` | Narrow `window.electronAPI` bridge for project file operations. |

The renderer detects whether `window.electronAPI` exists. When it is present, project open/save flows use native dialogs, recent project paths, and native recent-file reopening. When it is absent, the browser upload/download fallback remains available.

## Core App Areas

- `App.tsx` coordinates project loading, toolbar actions, modal state, cloud provider selection, and desktop save state.
- `components/` contains the workbench UI: viewer, sidebars, settings, export options, and annotation controls.
- `hooks/` owns React state for projects, annotations, PDF versions, selection, history, and integrations.
- `utils/` holds pure helpers for project validation, duplicate rules, CSV/export options, metadata, templates, and annotation sorting.
- `services/` wraps external or format-specific work such as PDF export, Gemini labeling, and cloud storage adapters.

## Project Files

Project JSON is self-contained. It stores document metadata, embedded PDF data, annotation regions, tags, colors, descriptions, versions, user-defined templates, and export-ready state.

This makes project files portable, but large PDFs will produce large JSON files because PDF bytes are stored as base64.

## PDF Rendering And Export

- PDF.js renders documents in the viewer.
- The viewer supports continuous-scroll rendering for every page and a single-page mode for focused review.
- Annotation coordinates remain page-scoped percentages, so drawing, moving, resizing, copying, and exporting stay stable across zoom levels and view modes.
- pdf-lib writes annotated PDF exports.
- Export options control whether labels, comments, colors, and selected fields appear in generated outputs.

## Desktop Security Model

The Electron window uses `contextIsolation` and keeps `nodeIntegration` disabled. The renderer receives only the project file API exposed by `electron/preload.cts`.

External links are handed to the operating system shell instead of opening arbitrary windows inside the app.

Packaged desktop builds check GitHub Releases for updates on startup through `electron-updater`. Development and unpackaged test runs skip update checks.

## Testing Strategy

The project uses layered verification:

- Vitest for pure helpers and focused component behavior.
- Playwright browser tests for real PDF workflows.
- Playwright Electron tests for preload and desktop save IPC behavior.
- Electron Builder for release packaging.

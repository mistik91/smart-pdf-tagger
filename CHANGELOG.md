# Changelog

All notable changes to Smart PDF Tagger are documented here.

This project follows a simple chronological changelog. Dates use `YYYY-MM-DD`.

## v1.0.1 - 2026-07-05

### Added

- Robust single-page multipage navigation with previous/next buttons, direct page input, page count display, and keyboard shortcuts.
- Browser end-to-end coverage proving annotations remain scoped to the page where they were created.

### Verified

- Unit tests, TypeScript checks, production build, browser workflow tests with the attached mortgage-interest PDF, Electron smoke tests, dependency audit, full installer build, and packaged executable launch.

## v1.0.0 - 2026-07-05

### Added

- Windows Electron desktop shell with native project open, save, and Save As dialogs.
- Generated desktop app icon and installer icon.
- Project metadata fields for client, document type, status, and reviewer.
- Annotation sorting by page, label, color, and update date.
- Visible comment indicators on annotated regions.
- Duplicate-label rules with project-wide, same-page, warn-only, and allow modes.
- Editable tag templates with import/export support.
- Export options for annotated PDFs and CSV field selection.
- Browser and Electron Playwright smoke coverage.

### Changed

- Documentation now separates public overview, architecture, testing, release, contribution, changelog, and security material.

### Verified

- Unit tests, TypeScript checks, production build, browser workflow tests, Electron smoke tests, dependency audit, full installer build, and packaged executable launch.

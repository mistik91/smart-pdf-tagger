# Changelog

All notable changes to Smart PDF Tagger are documented here.

This project follows a simple chronological changelog. Dates use `YYYY-MM-DD`.

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

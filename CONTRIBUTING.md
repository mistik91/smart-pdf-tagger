# Contributing

Thanks for helping improve Smart PDF Tagger. The project values focused changes, clear verification, and a compact UI that stays practical for repeated document work.

## Development Workflow

```bash
npm install
npm run dev
```

The browser app is the primary development surface. Use the desktop shell when a change touches native file open/save behavior:

```bash
npm run electron:dev
```

Optional integrations belong in `.env.local`; do not commit local environment files.

## Before You Commit

Run the checks that match your change. For broad UI, PDF, export, or desktop work, run the full set:

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm run test:electron
npm audit --audit-level=moderate
```

See [Testing](docs/TESTING.md) for what each command covers.

## Code Guidelines

- Prefer the existing React, hook, and utility patterns before adding new abstractions.
- Keep UI changes consistent with the compact, work-focused interface.
- Put pure business logic in `utils/` when it can be unit tested outside React.
- Keep Electron-specific behavior behind the preload bridge instead of leaking desktop assumptions into browser code.
- Add or update tests for behavior changes, especially project loading, annotation state, exports, versioning, and native file operations.

## Documentation Guidelines

- Keep the README concise and public-facing.
- Put operational detail in `docs/`.
- Update `CHANGELOG.md` for user-visible features, fixes, release changes, and breaking behavior.
- Document new environment variables in the README configuration table.

## Release Builds

Release builds are generated, not committed:

```bash
npm run electron:dist
```

The default Windows output is `%TEMP%\smart-pdf-tagger-release`. Upload installer assets to GitHub Releases.

## Repo Hygiene

Do not commit generated output or local state:

- `.env.local`
- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`
- `desktop-pack-test/`
- `test-results/`
- Playwright reports
- unsanitized PDFs or project JSON files

# Release Process

This project publishes Windows desktop builds through GitHub Releases.

GitHub Releases also provide the update feed used by packaged desktop builds on startup. Keep `latest.yml`, the installer, and the block map attached to each public release.

## Preconditions

- The working tree is clean except for intentional release changes.
- Version metadata in `package.json` matches the release tag.
- `CHANGELOG.md` has a section for the release.
- The app icon exists at `assets/app-icon.png` and `assets/app-icon.ico`.

## Verification

Run the full check set:

```bash
npm run test
npm run typecheck
npm run build
npm run test:browser
npm run test:electron
npm audit --audit-level=moderate
```

## Build

Create the Windows installer:

```bash
npm run electron:dist
```

The default output folder is:

```text
%TEMP%\smart-pdf-tagger-release
```

Set `ELECTRON_BUILDER_OUTPUT` when a different output folder is needed:

```powershell
$env:ELECTRON_BUILDER_OUTPUT="<output-directory>"
npm run electron:dist
```

## Publish

Create a release tag and upload:

- `Smart PDF Tagger Setup <version>.exe`
- `Smart PDF Tagger Setup <version>.exe.blockmap`
- `latest.yml`

Current Windows artifacts use the updater-compatible filename pattern `Smart-PDF-Tagger-Setup-<version>.exe`.

Generated binaries, unpacked app folders, and block maps should not be committed to git.

## Current Release

The current public release is [v1.2.4](https://github.com/mistik91/smart-pdf-tagger/releases/tag/v1.2.4).

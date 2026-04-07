---
title: Packaging and Versioning
created: '2026-04-06T00:00:00.000Z'
modified: '2026-04-06T15:57:26.000Z'
tags:
  - packaging
  - versioning
  - releases
order: 2
---
# Packaging and Versioning

This page explains the supported Cabinet install paths today, how releases are packaged, and how versioning and updates work across managed source installs, custom source installs, and Electron.

Cabinet is still experimental and moving fast. Before any upgrade, keep a separate copy of your `data/` folder or let Cabinet create a backup first.

## Install Kinds

Cabinet currently distinguishes between three install kinds:

- `source-managed` - created by `create-cabinet`
- `source-custom` - cloned or modified manually
- `electron-macos` - packaged macOS desktop app

Those install kinds matter because update behavior is different for each one.

## Running Cabinet Today

## 1. Source-managed install

This is the best path today for local users, contributors, and anyone who wants the most complete update flow.

### First install

```bash
npx create-cabinet@latest
cd cabinet
npm run dev:all
```

Open `http://localhost:3000`.

### Production-style run

```bash
npm ci
npm run build
npm run start
```

By default, Cabinet runs the web app on port `3000` and the daemon on port `3001`. Those can be overridden with `CABINET_APP_PORT` and `CABINET_DAEMON_PORT`.

`create-cabinet` now installs the exact GitHub release tarball that matches its npm version. It also writes install metadata so Cabinet can recognize the install as managed later.

## 2. Source-custom install

This is any install made from a manual git clone, a fork, or a working tree that Cabinet does not recognize as managed.

Typical flow:

```bash
git clone https://github.com/hilash/cabinet.git
cd cabinet
npm install
npm run dev:all
```

Custom source installs still get update checks, but Cabinet will not overwrite app code automatically. They receive manual upgrade guidance instead.

## 3. Electron macOS app

Electron is the desktop packaging track for Cabinet.

### Local packaging

```bash
npm run build
npm run electron:make
```

That uses Electron Forge and produces packaged desktop artifacts under `out/`.

### Release packaging

On release tags, GitHub Actions builds the macOS desktop artifacts and publishes them to the GitHub Release. The release manifest also records the expected macOS asset names.

### Desktop data location

The Electron app stores user data outside the app bundle so app updates do not replace user content. On macOS the default location is:

```text
~/Library/Application Support/Cabinet/cabinet-data
```

On first launch, the Electron app can either:

- start with a fresh managed data directory
- import an existing Cabinet `data/` directory from a source install

### Electron updates

For macOS, Cabinet uses Electron's native update path with `update-electron-app` and `autoUpdater`. The app checks automatically, downloads supported updates in the background, and asks the user to restart when the update is ready.

Linux auto-update is not part of v1.

## Versioning and Release Source of Truth

GitHub Releases are the canonical source of truth for every Cabinet release.

The version contract is:

- release tag: `vX.Y.Z`
- app version: `package.json`
- CLI version: `cli/package.json`
- release manifest version: `cabinet-release.json`

Those versions should match for a real release.

`cabinet-release.json` is generated from the tagged release and published as a GitHub Release asset. Clients poll the latest manifest here:

```text
https://github.com/hilash/cabinet/releases/latest/download/cabinet-release.json
```

That manifest tells Cabinet:

- the latest stable version
- the release tag
- the release notes URL
- the source tarball URL
- the matching `create-cabinet` version
- the Electron asset names for macOS

`create-cabinet` mirrors the same version and installs the matching release tarball, not the default branch `HEAD`.

Only the `stable` channel is used in v1. Draft and prerelease builds should not be treated as client updates.

## How Updates Work By Install Kind

### `source-managed`

- Cabinet checks for updates on startup, on focus, and periodically
- one-click apply is allowed only for recognized managed installs with clean app files
- before applying, Cabinet creates a project snapshot backup
- the updater preserves `data/`, `.env.local`, and install metadata
- after apply, Cabinet asks the user to restart

### `source-custom`

- Cabinet still checks for newer releases
- Cabinet shows release notes and manual upgrade guidance
- Cabinet does not overwrite custom app code automatically

### `electron-macos`

- Cabinet checks automatically through Electron's updater
- downloads happen in the background
- the user is prompted to restart when the update is ready
- desktop data stays outside the app bundle

## Data Survival and Migrations

Cabinet now uses a shared `CABINET_DATA_DIR` abstraction.

Default data locations:

- source installs: `./data`
- Electron: managed app-data directory outside the bundle

Update and migration safety rules:

- source self-updates create a project snapshot backup before replacing app files
- file migrations create a data backup before they run
- SQLite migrations run on startup
- SQL migration bookkeeping is owned by the migration runner
- file-backed schema changes have their own migration layer

Current backup locations:

- source installs: `../.cabinet-backups/<project>/<timestamp>-<reason>/`
- Electron: sibling backup directory next to the managed data root

Even with those protections, users should keep a separate copy of important data while Cabinet is still changing quickly.

## Releasing a New Cabinet Version

This is the release flow to use right now.

### Release prerequisites

Make sure GitHub Actions has the secrets needed for the parts you want to ship:

- `NPM_TOKEN` - required to publish `create-cabinet`
- `APPLE_ID` - required for macOS notarization
- `APPLE_APP_PASSWORD` - required for macOS notarization
- `APPLE_TEAM_ID` - required for macOS notarization
- `APPLE_SIGN_IDENTITY` - required for macOS code signing

`GITHUB_TOKEN` is provided automatically by GitHub Actions for the release and Electron publishing steps.

### Step-by-step

1. Pick the release version, for example `0.2.1`.
2. Update `package.json` to that version.
3. Update `cli/package.json` to that same version.
4. Refresh `package-lock.json` so the root package version stays aligned.

```bash
npm install --package-lock-only
```

5. Regenerate the release manifest for the same tag.

```bash
npm run release:manifest -- --tag v0.2.1
```

6. Run the release sanity checks you want before tagging.

```bash
npm run test:unit
npm run build
npm run electron:make
```

7. Commit the release changes.
8. Push the commit to GitHub.
9. Create and push the release tag.

```bash
git tag v0.2.1
git push origin v0.2.1
```

10. Let GitHub Actions publish the release artifacts.

The release workflow triggered by `vX.Y.Z` tags is responsible for:

- creating the GitHub Release
- uploading `cabinet-release.json`
- publishing `create-cabinet@X.Y.Z` to npm
- building and publishing Electron macOS artifacts

### What to verify after the tag ships

After GitHub Actions finishes, verify:

- the GitHub Release exists for `vX.Y.Z`
- `cabinet-release.json` is attached to that release
- `create-cabinet@X.Y.Z` is visible on npm
- the Electron macOS artifacts are attached to the GitHub Release
- the latest manifest URL resolves to the new version
- a fresh `npx create-cabinet@latest` install pulls the expected release

### Practical release checklist

For a normal release, this is the shortest safe sequence:

```bash
# 1. bump versions in package.json and cli/package.json
npm install --package-lock-only
npm run release:manifest -- --tag v0.2.1
npm run test:unit
npm run build
npm run electron:make
git add package.json cli/package.json package-lock.json cabinet-release.json
git commit -m "Release v0.2.1"
git push origin main
git tag v0.2.1
git push origin v0.2.1
```

If the Apple signing secrets are not configured yet, Electron packaging may still work locally, but the fully signed and notarized desktop release will not be production-ready.

## Recommended Operating Model Today

- Use `create-cabinet` for the best end-user install and update experience.
- Use Electron as the desktop packaging path for macOS, with user data stored outside the app bundle.
- Treat GitHub Releases as the release authority and keep npm, the app version, and the release manifest in lockstep.

---

Last Updated: 2026-04-06

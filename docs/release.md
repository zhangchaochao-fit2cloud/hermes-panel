# Release Guide

This guide describes the supported Hermes Panel distribution paths and the
checks to run before publishing.

## Supported Install Paths

### Desktop app

Use this for the native macOS, Windows, or Linux experience.

Local macOS build:

```bash
make app-build
make app-open
```

The macOS build writes:

```text
packages/panel-desktop/src-tauri/target/release/bundle/macos/Hermes Panel.app
packages/panel-desktop/src-tauri/target/release/bundle/dmg/Hermes Panel_<version>_aarch64.dmg
```

The desktop bundle includes the compiled BFF runtime under app resources. The
host machine still needs Node.js 20 or newer available on `PATH`, because the
desktop shell starts the packaged BFF with Node.

### GitHub Release

Push a version tag to trigger the release workflow:

```bash
make tag-push VER=v0.1.0-beta.1
```

The workflow in `.github/workflows/release-desktop.yml` builds:

- macOS arm64, x64, and universal bundles
- Windows installer artifacts
- Linux desktop packages
- npm tarball for `npx hermes-panel`
- VS Code `.vsix`
- `SHA256SUMS`

The workflow creates a draft release so artifacts can be reviewed before
publishing.

### npm browser runtime

Use this when users prefer a browser tab instead of a native app:

```bash
npx hermes-panel
```

The npm package includes:

- static web assets in `dist-web`
- compiled BFF runtime in `dist-bff`
- production BFF dependencies

It does not require access to this monorepo after installation.

### VS Code extension

Build and package locally:

```bash
make vscode-pack
```

The extension can send the active selection, file, or git diff to a running
Hermes Panel instance.

## Local Release Checks

Run the release-critical build used by CI:

```bash
make ci-release-critical
```

For full local verification:

```bash
make typecheck
make test
make ci-release-critical
make release-npm
```

For desktop packaging changes, also verify the app resource BFF can start:

```bash
APP_BFF="packages/panel-desktop/src-tauri/target/release/bundle/macos/Hermes Panel.app/Contents/Resources/resources/bff"
PANEL_TOKEN=smoke BFF_PORT=5977 node "$APP_BFF/dist/server.js"
curl http://127.0.0.1:5977/api/system/health
```

## Common Failure Points

### Tauri icon bundling fails

If Tauri reports `No matching IconType`, confirm `tauri.conf.json` lists the
platform icons:

- `icons/32x32.png`
- `icons/128x128.png`
- `icons/128x128@2x.png`
- `icons/icon.icns`
- `icons/icon.ico`

### Linux GitHub Actions desktop build fails

The Ubuntu runner needs WebKitGTK and Tauri packaging dependencies. Keep the
dependency list in CI and release workflows aligned:

- `libwebkit2gtk-4.1-dev`
- `libayatana-appindicator3-dev`
- `librsvg2-dev`
- `patchelf`
- `rpm`

### Packaged app starts but the BFF never listens

Check `~/.hermes-panel/desktop-bff.log`. The usual causes are:

- Node.js 20+ is not available on `PATH`.
- The packaged BFF resource is missing from app resources.
- A stale process is already using the selected BFF port range.

### npm tarball cannot import workspace packages

The published npm package must not contain `workspace:*` dependencies. Run:

```bash
make release-npm
tar -xOf dist/hermes-panel-*.tgz package/package.json | grep workspace:
```

The grep should print nothing.

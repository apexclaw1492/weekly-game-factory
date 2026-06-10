# Security Audit

Date: 2026-06-10
Version under audit: 1.3.7

## Scope

- Production source in `src/`
- Build and deployment configuration
- Public assets copied into GitHub Pages output
- Runtime browser security controls
- Production npm dependency tree

## Findings And Fixes

### Legacy third-party games were deployable from `public/games`

The curated legacy games include old third-party JavaScript, insecure HTTP URLs, external scripts, and remote score/share behavior. These assets are not acceptable for the production GitHub Pages build.

Fix:

- Changed Vite to publish only `public-safe`.
- Added safe first-party `favicon.ico` and `manifest.json`.
- Removed legacy URL-based curated games from the live catalog.
- Kept the native Phaser games in the live hub.

### Catalog URL launch was not allowlisted

The hub previously assigned catalog URLs directly to `window.location.href`. Current catalog values were local, but this was not defensively coded.

Fix:

- Added same-origin, `/games/`-path allowlisting before catalog URL navigation.
- Invalid catalog URLs now fail closed.

### Browser security policies were missing

The app did not define CSP, referrer, or permissions policies in the document.

Fix:

- Added a restrictive meta Content Security Policy for controls supported by GitHub Pages static hosting.
- Added `no-referrer`.
- Added a Permissions Policy denying unused hardware APIs and allowing motion sensors only for this app.

### Debug game object was always exposed

The full Phaser game object was attached to `window` in all builds.

Fix:

- `window.__WGF_GAME__` is now exposed only during development or when `?qa=1` is present.

### Local storage parsing could crash gameplay

Scenes parsed localStorage values directly. Corrupt or blocked storage could crash startup or game-over flows.

Fix:

- Added `SafeStorage` helpers.
- Migrated score/high-score reads and writes through safe wrappers.

### CI did not enforce dependency audit

Deploy workflow installed and built without a production vulnerability gate.

Fix:

- Added `npm audit --omit=dev --audit-level=moderate` to the GitHub Pages workflow.
- Updated the workflow runtime to Node 24.

## Verification

- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run build`: passed.
- `git diff --check`: passed.
- `npm run hub:routing`: passed for all five native games in phone portrait and phone landscape.
- `npm run smoke`: passed for desktop, phone portrait, and phone landscape.
- `npm run touch:all`: passed for F1 Space Invaders, Cosmic Cargo, Contra Bonus, Asteroid Belt, and Red Bull Pong.

The production build no longer includes `dist/games`.

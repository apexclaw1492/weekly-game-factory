# QA And Playtest Plan

## Purpose

The project cannot rely on "the canvas changed" as proof that a game works. QA must prove that a player can actually play each game on a mobile browser.

## Required QA Layers

### 1. Build Gate

Command:

```sh
npm run build
```

Pass criteria:

- TypeScript compiles.
- Vite build completes.
- No production asset path failures.

### 2. Render Smoke Gate

Command:

```sh
npm run smoke
```

Pass criteria:

- Hub loads.
- Each published game launches.
- Canvas is nonblank before and after input.
- Desktop, phone portrait, and phone landscape viewports render.
- No console errors or page errors.

This gate is necessary but not sufficient.

### 3. Mobile Gameplay Gate

Each certified game must have a state-based test.

Required checks:

- Launch from hub.
- Start gameplay.
- Dispatch real browser touch events, not only mouse clicks.
- Verify player movement changed.
- Verify primary action changed game state.
- Verify objective state changed.
- Verify return-to-hub works.
- Run in portrait and landscape.

Current reference:

```sh
npm run touch:f1
```

Required future commands:

```sh
npm run touch:cargo
npm run touch:contra
npm run touch:asteroids
npm run touch:all
```

### 4. Live Deployment Gate

After pushing:

```sh
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status
curl -L 'https://apexclaw1492.github.io/weekly-game-factory/?v=<version>'
env BASE_URL='https://apexclaw1492.github.io/weekly-game-factory/?v=<version>' npm run touch:all
```

Pass criteria:

- Pages workflow succeeds.
- Live HTML shows the expected visible version badge.
- Live bundle asset is updated.
- Live touch tests pass.

## Browser Player Agent Protocol

The browser-player agent must test like a player, not like a screenshot collector.

For each game and orientation:

1. Load the hub fresh.
2. Enter from preload without accidental hidden-card launch.
3. Tap the intended card.
4. Start the game.
5. Perform the intended mobile gesture.
6. Record before/after QA state.
7. Return to hub.
8. Capture screenshots only as supporting evidence.

Report format:

- Game.
- Orientation.
- Gesture used.
- Before state.
- After state.
- Pass/fail.
- Defect summary.
- Evidence path.

## QA Agent Protocol

The QA agent reviews both product compliance and technical proof.

The QA agent must reject a release if:

- A game passes render smoke but lacks gameplay state proof.
- A touch gesture does not change the intended gameplay state.
- A game works only in portrait or only in landscape.
- Preload/hub routing is ambiguous.
- A scene reads raw input outside the shared runtime.
- The live Pages version cannot be confirmed.

## Manual iPhone QA

Manual testing is still required before claiming all games are production-ready.

Checklist:

- Open Safari on iPhone.
- Navigate to the GitHub Pages URL with a version query.
- Confirm the visible version badge.
- Test portrait.
- Rotate to landscape.
- Test landscape.
- Return to hub.
- Refresh page and repeat one game.
- Add to Home Screen and test installed web-app mode.

## Defect Severity

### P0

- Game cannot start.
- Touch does nothing during gameplay.
- Wrong game launches.
- Live Pages deploy does not match repo.

### P1

- Main action unreliable.
- Orientation breaks gameplay.
- Return-to-hub fails.
- Player dies during basic non-danger gesture.

### P2

- Scoring or HUD wrong.
- Audio/haptics missing.
- Difficulty tuning poor but playable.

### P3

- Visual polish.
- Extra accessibility toggles.
- Optional device-motion enhancements.

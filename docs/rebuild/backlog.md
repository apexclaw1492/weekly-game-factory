# Mobile Arcade Rebuild Backlog

## Backlog Rules

- Work from top to bottom unless a blocker is documented.
- Do not certify a game based on rendering alone.
- Do not rebuild a second game until the shared runtime contract is stable.
- Each story must include objective QA evidence before it is done.

## Epic 1: Release Control And Hub Safety

### WGF-001: Fix Preload-To-Hub Tap Routing

Priority: P0
Status: Done in v1.3.6

Problem:

- A single preload tap can also activate a hidden hub card under the same coordinate.

Acceptance:

- First tap from preload only transitions to hub.
- Hub cards cannot launch until the next distinct touch gesture.
- Automated test probes all card y-coordinates and center tap.

### WGF-002: Add Certified/In-Rebuild Hub States

Priority: P0
Status: Done in v1.3.6

Acceptance:

- Hub displays certified playable games normally.
- Uncertified games are hidden or clearly labeled "In rebuild".
- Uncertified games cannot be mistaken for finished playable games.

### WGF-003: Add Version And Certification Metadata

Priority: P1
Status: Partial in v1.3.6

Acceptance:

- Visible page badge shows version and publish date.
- Hub can show each game certification status.
- QA state reports app version.

## Epic 2: Shared Mobile Arcade Runtime

### ✅ WGF-010: Build Normalized Input Runtime **(DONE)**

Priority: P0

Acceptance:

- All raw touch, gesture, keyboard, and motion data normalize to `ArcadeInputFrame`.
- Held input clears on release, resize, scene transition, and visibility change.
- No scene owns raw DOM touch listeners.

### ✅ WGF-011: Scene Lifecycle Contract **(DONE)**

Priority: P0

Acceptance:

- Every game implements start, play, pause, retry, back, reset, and cleanup through shared helpers.
- Active gameplay touches cannot trigger start/retry/next/back by accident.

### WGF-012: Build Viewport Layout Service

Priority: P0

Acceptance:

- Layout service returns safe-area bounds, HUD band, gameplay rectangle, and orientation.
- Required viewport matrix is covered.
- Scene resize does not rely on stale `width` or `height` captured during `create()`.

### WGF-013: Build Shared QA State API

Priority: P0
Status: Partial in v1.3.6

Acceptance:

- Every scene returns `getGameplayStateForQA()`.
- Tests can compare before/after state without private scene hacks.

## Epic 3: F1 Space Invaders Certification

### WGF-020: Convert F1 To Shared Runtime

Priority: P0

Acceptance:

- F1 consumes only normalized input.
- Drag moves the player.
- Hold fires.
- Start/back are lifecycle actions.

### WGF-021: Restore Core Arcade Rules

Priority: P1

Acceptance:

- Lives work.
- Shields work.
- Saucer bonus works.
- Row-based scoring works.
- One-missile classic option is available or ruleset decision is documented.

### WGF-022: F1 Touch Certification Test

Priority: P0

Acceptance:

- Portrait and landscape public-site test proves movement, firing, enemy destruction, score increase, and return-to-hub.

## Epic 4: Cosmic Cargo Rebuild

### WGF-030: Rebuild Cosmic Cargo Input

Priority: P0

Acceptance:

- Hold boosts and consumes fuel.
- Swipe changes gravity fallback.
- Tilt changes gravity only after permission is granted.
- Start/retry/back cannot conflict with boost.

### WGF-031: Rebuild Cargo Level Validity

Priority: P0

Acceptance:

- Cargo, asteroids, player, portal, HUD, and safe zones do not overlap.
- Orientation change regenerates or safely reflows the level.

### WGF-032: Cosmic Cargo Touch Certification Test

Priority: P0

Acceptance:

- Portrait and landscape tests prove fuel changes, gravity changes, cargo progress changes, and return-to-hub works.

## Epic 5: Contra Bonus Rebuild

### WGF-040: Rebuild Contra Touch Movement And Aim

Priority: P0

Acceptance:

- Drag controls run and aim.
- Swipe up produces one jump event.
- Hold or engagement fires consistently.

### WGF-041: Rebuild Contra Responsive Layout

Priority: P0

Acceptance:

- Ground, camera, player, enemies, platforms, and boss remain valid in portrait and landscape.
- Landscape no longer clips the playfield.

### WGF-042: Contra Touch Certification Test

Priority: P0

Acceptance:

- Portrait and landscape tests prove movement, jump, firing, enemy/boss damage, and return-to-hub.

## Epic 6: Asteroid Belt Rebuild

### WGF-050: Rebuild Asteroids Touch Steering

Priority: P0

Acceptance:

- Drag or tilt steers predictably.
- Thrust is deliberate.
- Fire/autofire is testable and documented.

### WGF-051: Make Asteroids Fair On Basic Gesture

Priority: P0

Acceptance:

- The player does not lose a life during a simple safe test gesture unless collision is deliberately induced.
- Spawn safe zone is enforced.

### WGF-052: Asteroids Touch Certification Test

Priority: P0

Acceptance:

- Portrait and landscape tests prove steering, thrust/fire, asteroid hit or split, lives stable during safe gesture, and return-to-hub.

## Epic 7: Deployment And Regression

### WGF-060: Add `touch:all`

Priority: P0

Acceptance:

- One command runs all certified mobile gameplay tests locally or against `BASE_URL`.

### WGF-061: Add GitHub Actions Gameplay Gate

Priority: P1

Acceptance:

- CI runs build and certified gameplay tests.
- Pages deploy is blocked or marked failed if certified tests fail.

### WGF-062: Add Manual iPhone Release Checklist

Priority: P1

Acceptance:

- Release notes include manual iPhone Safari and installed web-app verification.

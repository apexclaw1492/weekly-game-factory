# Status Board — Weekly Game Factory Rebuild

Last updated: June 3, 2026

## Overall Progress

| Phase | Ticket | Status |
|-------|--------|--------|
| Epic 2: Shared Runtime | **WGF-010 — Input Types** (ArcadeInputFrame.ts) | ✅ Done |
| Epic 2: Shared Runtime | **WGF-010 — Input Runtime** (InputRuntime.ts) | ✅ Done |
| Epic 2: Shared Runtime | **WGF-010 — Integration with main.ts** | ❌ Not started |
| Epic 2: Shared Runtime | **WGF-011 — Scene Lifecycle Contract** (GameLifecycle.ts + LifecycleManager.ts) | ✅ Done |
| Epic 2: Shared Runtime | **WGF-012 — Viewport Layout Service** (ViewportLayoutService.ts) | ✅ Done |
| Epic 3: F1 Conversion | **WGF-020 — Convert F1 to Shared Runtime** (refactored SpaceInvadersScene) | ✅ Done |
| Epic 3: F1 | **WGF-022 — F1 Touch Certification Test** | ❌ Not started |
| Epic 4-6 | Cargo, Contra, Asteroids rebuilds | ❌ Blocked by Epic 2 |

## Game Status

| Game | Local Render | Local Touch | Live Site | Notes |
|------|-------------|-------------|-----------|-------|
| F1 Space Invaders | ✅ | ✅ Provisional | ❌ Not verified | Uses old TouchControls, not InputRuntime |
| Cosmic Cargo | ✅ | ✅ Provisional | ❌ Not verified | Uses old TouchControls |
| Contra Bonus | ✅ | ✅ Provisional | ❌ Not verified | Uses old TouchControls |
| Asteroid Belt | ✅ | ✅ Provisional | ❌ Not verified | Uses old TouchControls |

## Legend

- ✅ Done / Passing
- ⚠️ In progress / Partial
- ❌ Not started / Blocked

## Tickets (Next Up)

### WGF-011 — Scene Lifecycle Contract
Create standard hooks that every game scene implements. Each scene must expose:
- `showStart()` — show start overlay
- `startGameplay()` — begin active play
- `pauseGameplay()`, `resumeGameplay()` — toggle pause
- `resetGameplay()` — full state reset
- `returnToHub()` — clean transition back
- `handleArcadeInput(frame: ArcadeInputFrame)` — consume input
- `getGameplayStateForQA()` — return QA state

### WGF-012 — Viewport Layout Service
Responsive layout helper that provides safe-area-aware dimensions and handles orientation changes consistently across all scenes.

### WGF-020 — Convert F1 to Shared Runtime
Refactor SpaceInvadersScene to:
- Remove old TouchControls dependency
- Implement Scene Lifecycle Contract
- Consume ArcadeInputFrame from InputRuntime
- Remove raw pointer/input listeners

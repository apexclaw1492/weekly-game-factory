# Project Organization

This repo is the weekly browser arcade hub. Nearby folders in `/Users/apexclaw/Projects`, such as `contra-game` and `f1-racer-ai-project`, are separate projects with their own git histories and should stay outside this repo unless you intentionally migrate one of them.

## Current Structure

- `src/main.ts`: Phaser app configuration and scene registration.
- `src/data/gameCatalog.ts`: game metadata, hub display data, and scene classes.
- `src/scenes/`: boot, preload, hub, and playable games.
- `src/objects/`: reusable Phaser objects.
- `src/utils/`: reusable technical helpers.
- `assets/` and `public/`: static web assets.
- `scratch/`: local testing scripts and screenshot artifacts.
- `templates/`: standalone starter template for future experiments.

## Recommended Next Changes

- Move repeated per-game UI behavior into shared helpers: back button creation, resize cleanup, score display, and game-over overlays.
- Split large game scenes once they grow past one responsibility. Good first targets are input handling, spawning, collisions, and HUD rendering.
- Move generated texture definitions out of `BootScene` into per-game texture modules so boot stays small and each game owns its art.
- Add a small Playwright smoke test that loads the hub, opens each game card, and confirms the canvas still renders after a few seconds.
- Decide whether old standalone projects should be archived, migrated into `templates/`, or left as separate experiments.

## Product Requirements

- `docs/rebuild/README.md`: read order for the mobile-first rebuild control docs.
- `docs/rebuild/master-prd.md`: master product requirements, certification rules, and release policy.
- `docs/rebuild/mobile-input-architecture.md`: shared hardware-first input contract for all games.
- `docs/rebuild/qa-and-playtest-plan.md`: local, browser-player, QA, manual iPhone, and live-site verification gates.
- `docs/rebuild/backlog.md`: prioritized rebuild backlog with acceptance criteria.
- `docs/rebuild/status-board.md`: current certification status and next milestones.
- `docs/rebuild/subagent-playbook.md`: design, browser-player, and QA subagent responsibilities.
- `docs/prd/arcade-modernization-roadmap.md`: shared touchscreen, orientation, lifecycle, and testing requirements.
- `docs/prd/f1-space-invaders-prd.md`: Space Invaders/F1 game requirements.
- `docs/prd/asteroid-belt-prd.md`: Asteroids game requirements.
- `docs/prd/contra-bonus-prd.md`: Contra-style run-and-gun requirements.
- `docs/prd/cosmic-cargo-prd.md`: original gravity cargo game requirements.

# Product Requirements: F1 Space Invaders

## Product Summary

F1 Space Invaders is a Formula 1-themed arcade shooter based on the original Space Invaders contract: a player-controlled base moves horizontally, fires upward, survives descending enemy formations, and clears waves. The F1 theme should change presentation, not the core arcade rules unless explicitly marked as a modern mode.

## Current Implementation

Source: `src/scenes/SpaceInvadersScene.ts`

Implemented:

- Player car moves left/right at the bottom of the screen.
- Player fires upward bullets with cooldown.
- Enemy cars spawn in a rectangular formation.
- Formation moves horizontally, reverses at screen edges, and shifts downward.
- Random enemy bullets fall toward the player.
- One player hit causes game over.
- Clearing all enemies advances the level.
- Combo multiplier and speed power-up exist as modern additions.
- Keyboard arrows and Space are supported.
- Touch play uses drag or tilt for lateral aim and hold-to-fire, with no visible virtual fire/move buttons.
- High scores are stored in `localStorage`.

## Arcade Reference Target

Classic Space Invaders requirements:

- Formation advances step by step, not as smooth continuous drift.
- Remaining invaders accelerate as more are destroyed.
- Player can have only one missile active at a time.
- Bottom invaders are the shooters.
- Four shields block both enemy and player shots and erode over time.
- UFO/saucer crosses the top for bonus points.
- Player has lives, not immediate final game over from one hit.
- Invader reaching the ground ends the game regardless of remaining lives.
- Scoring is row-based: lower/middle/top invaders and saucer score differently.

Reference: https://strategywiki.org/wiki/Space_Invaders/Gameplay

## Problems To Fix

### Functional Bugs

- `stars` is not reset in `init()`, so repeated restarts can accumulate stars.
- Resize listener is registered but not removed on scene shutdown.
- Global `pointerdown` can still conflict with start/retry/back flows if scene-level state guards regress.
- Keyboard fields are conditionally initialized but later dereferenced directly.
- Gesture and tilt state must clear after release, restart, and resize.

### Arcade Fidelity Gaps

- No shields.
- No lives.
- No player death/reset cycle.
- No saucer.
- No exposed-invader shooting rule.
- No one-missile limit.
- No step-based formation timing.
- No row-based scoring.
- Power-ups and combo scoring conflict with a faithful arcade mode.

## Product Goals

- Make the default game feel like arcade Space Invaders with an F1 visual skin.
- Preserve optional modern additions only behind a separate "Remix" ruleset.
- Make portrait and landscape touch play reliable without unintended taps.
- Ensure the game is fair on small screens.

## Non-Goals

- Exact licensed Space Invaders art.
- Exact ROM-level timing.
- Multiplayer in the first pass.

## Gameplay Requirements

### Classic Mode

- Enemy grid is 11 columns by 5 rows where viewport permits.
- If viewport is too narrow, grid may scale down but must preserve 5 rows and clear columns.
- Formation moves in discrete steps.
- Step interval decreases as invader count decreases.
- Formation drops one row when the edge-most live invader reaches the horizontal boundary.
- Only the lowest live invader in each column may fire.
- Player may have one active missile.
- Enemy bullets may destroy shields and player.
- Player missile may destroy enemies, saucer, and shields.
- Invader landing ends the game.
- Player starts with 3 lives.
- Extra life threshold should be configurable.

### F1 Theme

- Player remains an F1 car or race craft.
- Enemy formation remains F1-themed.
- Saucer may become a safety car, drone, or bonus vehicle.
- Shields may be pit-wall barriers or energy barriers.

### Remix Mode

Optional after classic mode works:

- Combo scoring.
- Speed power-ups.
- Larger procedural formations.
- Faster enemy bullets.

## Touch Requirements

### Portrait And Landscape

- Drag or tilt controls lateral aim.
- Holding the screen fires.
- No visible virtual FIRE, LEFT, or RIGHT buttons.
- Player baseline, shields, enemies, bullets, HUD, and back affordance must remain readable in both orientations.
- Start/retry must be state-gated so active play gestures do not accidentally restart or leave the game.

## Acceptance Criteria

- Game launches from hub in all required viewport sizes.
- Player can move left/right and fire on keyboard and touch.
- Touch movement/fire gestures never start, retry, advance level, or return to hub during active play.
- Classic mode has lives, shields, saucer, one player missile, row scoring, exposed-invader shooting, and count-based speedup.
- Game over occurs when lives reach zero or an invader lands.
- Twenty retries do not increase star count or duplicate resize handlers.
- No console errors during start, play, resize, game over, retry, and return to hub.

## Implementation Notes

- Move scoring, formation, saucer, shields, and difficulty constants into a rules object.
- Use shared input actions: `left`, `right`, `fire`, `start`, `back`.
- Use a fixed arena layout that reserves top HUD and keeps phone gestures invisible during play.
- Add smoke tests that validate both classic and touch behavior.

# Product Requirements: Cosmic Cargo

## Product Summary

Cosmic Cargo is an original arcade-style gravity puzzle/action game. The player flips gravity, boosts a ship, collects cargo, avoids asteroids, and exits through a portal. Unlike the other games, this is not a direct clone target; its requirement is to be as clear, fair, and durable as a coin-op arcade game.

## Current Implementation

Source: `src/scenes/CosmicCargoScene.ts`

Implemented:

- Player ship affected by directional gravity.
- Arrow keys flip gravity.
- Swipe gestures flip gravity.
- Holding the screen or pressing Space boosts.
- Tilt or swipe flips gravity on touch devices.
- Fuel limits boost and regenerates slowly.
- Cargo pods must be collected.
- Portal completes the level after all cargo is collected.
- Asteroids move and collide with ship.
- Near misses award points.
- Levels increase cargo and asteroid counts.
- Local high score is stored in `localStorage`.

## Arcade Design Target

Cosmic Cargo should behave like a purpose-built arcade machine:

- Rules are visible within seconds.
- Input mapping is unambiguous.
- Death is fair and readable.
- Levels are procedurally varied but never impossible.
- Difficulty ramps through speed, density, fuel pressure, and route complexity.
- Portrait and landscape layouts preserve the same core skill.

## Problems To Fix

### Functional Bugs

- Touch input previously depended on ambiguous tap/boost/control zones; current target is state-gated start/retry plus hold-to-boost during active play.
- Pointer guard uses initial `height` and can be wrong after resize.
- Portal moves on resize, but cargo, asteroids, ship, world bounds, and safe zones are not revalidated.
- Procedural placement does not prevent cargo-cargo, cargo-asteroid, asteroid-asteroid, HUD, control, or portal overlap.
- Fuel has weak design pressure because it regenerates and failure is collision-based.
- Star arrays can accumulate across restarts.
- Resize/listener cleanup is incomplete.

## Product Goals

- Make gravity flipping immediately understandable.
- Make boost intentional and separate from start/retry/continue.
- Guarantee procedural levels are fair in both orientations.
- Make fuel meaningful.
- Preserve fast arcade retries.

## Non-Goals

- Direct clone of Lunar Lander, Gravitar, or Thrust.
- Complex campaign progression in first pass.
- Network scoreboards.

## Gameplay Requirements

### Core Loop

- Start level.
- Inspect cargo, asteroid hazards, gravity direction, fuel, and portal.
- Flip gravity to route ship.
- Boost to correct trajectory.
- Collect all cargo.
- Reach unlocked portal.
- Receive score and fuel bonus.
- Continue to harder level or retry after failure.

### Gravity

- Gravity direction must be visible at all times.
- Gravity changes must have sound and visual feedback.
- Gravity flip cannot be accidentally triggered by back navigation or start/retry state changes.
- Gravity vector must update physics immediately.

### Boost And Fuel

- Boost must be an explicit hold action on touch and Space action on keyboard.
- Fuel cost per boost must be tunable.
- Fuel regeneration must be tunable or removable.
- Product decision required:
  - Fuel as score bonus only.
  - Fuel as boost resource.
  - Fuel as fail condition.
  - Fuel as all three.

Recommended MVP: fuel is a boost resource and end-level bonus, not a fail timer.

### Procedural Level Rules

- Cargo must not overlap cargo, asteroids, ship, portal, HUD, or control zones.
- Asteroids must not spawn in immediate unavoidable collision paths.
- Portal must have an unlocked/locked visual state.
- Ship spawn must have a minimum safe radius.
- Regenerate layout after orientation change unless object-preserving reflow is proven safe.

## Touch Requirements

### Portrait And Landscape

- Tilt is the primary gravity selector where device motion permission is available.
- Swipe remains the gravity fallback.
- Hold anywhere in active play boosts; release returns to drift.
- No visible gravity direction buttons or BOOST button.
- Gravity direction indicator remains near the HUD.
- Cargo and asteroids cannot spawn under HUD or unsafe play bounds.

## Acceptance Criteria

- Game launches from hub in all required viewport sizes.
- Player can start, flip gravity, boost, collect cargo, complete level, retry, and return to hub on keyboard and touch.
- Touch input cannot confuse active boost with start/retry/continue/back.
- Gravity direction is visible before and during gameplay.
- Portal locked/unlocked state is clear.
- Procedural generation validates no overlaps in ship, cargo, asteroid, portal, HUD, or controls.
- Orientation change keeps all active objects visible and fair or regenerates the level cleanly.
- Fuel behavior is documented and testable.
- No console errors during start, play, resize, collision, level complete, retry, and return to hub.

## Implementation Notes

- Maintain a hardware-first `tilt/swipe/hold` control scheme.
- Add procedural placement validator using layout safe rectangles.
- Add gravity indicator component.
- Separate boost pointer handling from scene-level tap handling.
- Add tunable difficulty table per level.

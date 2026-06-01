# Product Requirements: Asteroid Belt

## Product Summary

Asteroid Belt is an Asteroids-inspired arcade shooter. The target experience is a faithful one-screen vector-style survival game: rotate, thrust, fire, wrap around the screen, split asteroids, avoid saucers, and chase score.

## Current Implementation

Source: `src/scenes/AsteroidsScene.ts`

Implemented:

- Ship rotates left/right and thrusts forward.
- Ship uses inertia, damping, max velocity, and screen wrapping.
- Asteroids spawn, wrap, and split into smaller asteroids.
- Bullets fire forward and expire after a lifetime.
- Three lives and temporary respawn invulnerability.
- Score values roughly match large/medium/small asteroid values but are multiplied by combo.
- Auto-fire is enabled by default.
- Touch controls provide rotate, thrust, and auto/manual toggle.
- High score is stored in `localStorage`.

## Arcade Reference Target

Classic Asteroids requirements:

- Player rotates, thrusts, fires, and may use hyperspace.
- Ship and asteroids wrap around screen edges.
- Large asteroids split into medium asteroids; medium split into small asteroids.
- Saucers appear periodically and fire at the player.
- Player has limited simultaneous shots, commonly up to four.
- Extra lives are awarded by score threshold.
- The game continues until all lives are lost.

References:

- https://strategywiki.org/wiki/Asteroids/Gameplay
- https://en.wikipedia.org/wiki/Asteroids_%28video_game%29

## Problems To Fix

### Functional Bugs

- `stars` is not reset on scene restart.
- Resize listener is not removed on shutdown.
- Start/retry pointer guard captures initial height and may be wrong after orientation change.
- Touch controls can leave held state stuck after resize.
- Asteroids can spawn behind or under HUD areas.

### Arcade Fidelity Gaps

- Auto-fire default diverges from the original.
- Bullets do not wrap.
- No hyperspace.
- No saucers.
- No saucer bullets.
- No extra-life thresholds.
- No shot cap matching arcade behavior.
- Combo multiplier is a modern mechanic, not classic Asteroids.
- Visual style is filled sprite-like art, not strongly vector-line.

## Product Goals

- Make the default mode faithful to Asteroids controls and risk/reward.
- Keep optional auto-fire as accessibility, not default.
- Make touchscreen play viable without removing the arcade skill curve.
- Preserve readability in both orientations.

## Non-Goals

- Exact vector hardware simulation.
- Exact original saucer AI exploit behavior.
- Multiplayer in first pass.

## Gameplay Requirements

### Classic Mode

- Manual fire is default.
- Up to four active player shots may exist at a time.
- Player bullets wrap or expire according to chosen classic rule; document the chosen behavior.
- Ship wraps across all edges.
- Asteroids wrap across all edges.
- Hyperspace action relocates ship randomly and carries risk.
- Large asteroids split into two medium asteroids.
- Medium asteroids split into two small asteroids.
- Small asteroids are destroyed.
- Saucers appear on timed intervals.
- Large saucer fires inaccurate shots.
- Small saucer fires more accurate shots.
- Extra life threshold is configurable, initially 10,000 points.
- Respawn must wait for a safe zone or provide visible invulnerability.

### Modern Options

Optional accessibility toggles:

- Auto-fire.
- Reduced motion.
- Larger touch controls.
- Lower saucer accuracy.

## Touch Requirements

### Portrait

- Rotate left/right bottom-left.
- Thrust bottom-right.
- Fire button near thrust but separated enough for thumb accuracy.
- Hyperspace should be a smaller emergency button away from fire/thrust.
- Auto-fire toggle, if enabled, must be above the action cluster and hard to hit accidentally.

### Landscape

- Rotate controls lower-left.
- Thrust/fire lower-right.
- Hyperspace reachable but not in primary thumb path.
- Controls must not obscure central asteroid field.

## Acceptance Criteria

- Game launches from hub in all required viewport sizes.
- Keyboard and touch both support rotate, thrust, fire, start, retry, and back.
- Default mode uses manual fire.
- Shot cap is enforced.
- Saucers spawn and can kill or be killed.
- Hyperspace can relocate the player and can fail dangerously.
- No asteroid, saucer, HUD, back button, or touch control overlap at spawn.
- Orientation changes preserve valid world bounds and clear stuck input.
- Twenty restarts do not increase star count or duplicate resize handlers.
- No console errors during start, play, resize, death, retry, and return to hub.

## Implementation Notes

- Add `fire` and `hyperspace` to the touch control scheme.
- Use a wrapping arena layout profile.
- Add saucer state machine separate from asteroid logic.
- Move score values and difficulty ramps into a rules object.
- Add tests for bullet cap, asteroid split counts, saucer spawn, and safe respawn.


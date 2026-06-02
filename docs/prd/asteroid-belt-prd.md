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
- Touch play uses tilt or drag for steering, swipe-up for thrust, and autofire on touch devices.
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
- Gesture and tilt state can leave held state stuck after resize if release/reset handling regresses.
- Asteroids can spawn behind or under HUD areas.

### Arcade Fidelity Gaps

- Touch autofire diverges from the original, but is accepted for the phone-first mode because it removes a virtual button dependency.
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
- Keep manual fire on desktop; use autofire on touch to avoid virtual action buttons.
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

### Portrait And Landscape

- Tilt or drag controls steering.
- Swipe up thrusts.
- Touch defaults to autofire; multi-touch may trigger burst/manual fire behavior.
- No visible rotate, thrust, fire, hyperspace, or auto labels.
- Controls must not obscure the asteroid field because gameplay gestures are invisible.

## Acceptance Criteria

- Game launches from hub in all required viewport sizes.
- Keyboard and touch both support rotate, thrust, fire, start, retry, and back.
- Desktop default uses manual fire; touch default uses autofire for phone playability.
- Shot cap is enforced.
- Saucers spawn and can kill or be killed.
- Hyperspace can relocate the player and can fail dangerously.
- No asteroid, saucer, HUD, or back affordance overlap at spawn.
- Orientation changes preserve valid world bounds and clear stuck input.
- Twenty restarts do not increase star count or duplicate resize handlers.
- No console errors during start, play, resize, death, retry, and return to hub.

## Implementation Notes

- Keep the touch control scheme hardware-first: tilt/drag steering, swipe thrust, autofire.
- Use a wrapping arena layout profile.
- Add saucer state machine separate from asteroid logic.
- Move score values and difficulty ramps into a rules object.
- Add tests for bullet cap, asteroid split counts, saucer spawn, and safe respawn.

# Arcade Modernization Roadmap

## Purpose

Weekly Game Factory currently contains four playable Phaser prototypes. They launch and respond to input, but they are not yet robust arcade-quality games on touchscreen devices or across both portrait and landscape layouts.

This roadmap defines the shared requirements that every game must satisfy before individual gameplay tuning is meaningful.

## Current System Findings

- Scene resize listeners are registered inside scenes and are not consistently removed on shutdown.
- Touch controls are implemented as scene objects with hardcoded positions, not as safe-area-aware fixed overlays.
- Scene-level `pointerdown` handlers can conflict with touch-control buttons.
- Several scenes capture `width` or `height` during `create()` and reuse those values after orientation changes.
- Starfield arrays are appended in `create()` and not reset in `init()`, so repeated restarts can accumulate extra work.
- Responsive behavior is mostly HUD repositioning; gameplay objects, safe spawn zones, and playfield bounds are not consistently recalculated.
- Existing smoke testing is coordinate-based and only validates a small desktop path.

## Shared Product Requirements

### Input Model

Every game must consume a normalized input layer instead of directly mixing keyboard, pointer, swipe, and virtual-button state inside gameplay scenes.

Required actions:

- `left`
- `right`
- `up`
- `down`
- `fire`
- `jump`
- `boost`
- `start`
- `back`
- `pause`
- `hyperspace`
- `autoFireToggle`

Each action must expose:

- `held`
- `justPressed`
- `justReleased`
- source device: keyboard, pointer, virtual control, or gesture

Acceptance criteria:

- Holding a virtual button through orientation change must not leave an action stuck.
- Touching a virtual control must not trigger scene-level start/retry/fire handlers.
- Keyboard and touch must both support start, play, retry, and return-to-hub.
- Contra-style multi-button play must support movement plus aim plus jump/fire simultaneously.

### Responsive Layout

Every game must define a layout profile:

- Fixed arena: Space Invaders.
- Wrapping arena: Asteroid Belt.
- Physics sandbox: Cosmic Cargo.
- Scrolling platformer: Contra Bonus.

Shared viewport service must provide:

- `width`
- `height`
- orientation
- safe-area padding
- top HUD band
- bottom control band
- gameplay-safe rectangle
- text scale bucket

Acceptance criteria:

- Required test sizes: `320x568`, `390x844`, `430x932`, `667x375`, `844x390`, `768x1024`, `1024x768`, `800x600`.
- HUD, back button, virtual controls, player spawn, enemies, collectibles, and portals must not overlap.
- On orientation change, each game must either reflow existing objects safely or regenerate the level.
- Touch controls must remain fixed to screen space during camera movement.

### Scene Lifecycle

Every scene must clean up:

- resize listeners
- pointer listeners
- keyboard listeners
- timers
- tweens
- transient particles
- generated per-run object arrays

Acceptance criteria:

- Twenty cycles of hub -> game -> retry -> hub must not increase resize-handler count, star count, or idle CPU cost.
- Restarting a scene must reset all gameplay and input state.
- Returning to hub must not leave hidden physics objects or active timers from the previous game.

### Testing

Create catalog-driven smoke tests using `GAME_DEFINITIONS`.

Each game test must:

- Load hub.
- Launch game.
- Wait for stable rendered frame.
- Start gameplay.
- Exercise primary controls.
- Resize from portrait to landscape and back.
- Check for console errors and page errors.
- Confirm canvas is nonblank before and after input.
- Return to hub.

CI minimum:

- `npm run build`
- browser smoke test matrix

## Implementation Phases

### Phase 1: Stabilize Runtime

- Add normalized input layer.
- Refactor touch controls to fixed, safe-area-aware overlays.
- Add lifecycle cleanup helper.
- Add automated smoke tests.
- Fix star accumulation and stale resize handlers.

### Phase 2: Restore Arcade Fidelity

- Rework Space Invaders and Asteroid Belt against their classic arcade contracts.
- Rework Contra controls, aiming, world scale, and touch layout.
- Formalize Cosmic Cargo as an original arcade-style game with explicit control and difficulty rules.

### Phase 3: Polish And Balance

- Add per-game tuning tables.
- Add difficulty ramps.
- Add pause/help overlays.
- Add consistent audio settings.
- Add accessibility toggles for auto-fire, reduced motion, and control opacity.

## Reference Sources

- Space Invaders gameplay reference: https://strategywiki.org/wiki/Space_Invaders/Gameplay
- Space Invaders arcade service manual: https://arcarc.xmission.com/PDF_Arcade_Manuals_and_Schematics/Space_Invaders_Service_Instructions_and_Parts_Catalog_%28SV070019%29.pdf
- Asteroids gameplay reference: https://strategywiki.org/wiki/Asteroids/Gameplay
- Asteroids overview: https://en.wikipedia.org/wiki/Asteroids_%28video_game%29
- Contra overview: https://en.wikipedia.org/wiki/Contra_%28video_game%29


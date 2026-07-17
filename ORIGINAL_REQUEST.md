# Original User Request

## Initial Request — 2026-07-11T11:57:08Z

Review, rebuild, and optimize all 9 games in the Weekly Game Factory to ensure ease of use, responsive PWA portability (iOS/Android), and a cohesive, modern visual theme.

Working directory: `/Users/apexclaw/Projects/weekly-game-factory`
Integrity mode: development

## Requirements

### R1. Cohesive Visual Theme (Robinhood Inspired)
The overall layout, game hub, menus, buttons, overlays, and color palettes must strictly reflect the premium, minimalist design of robinhood.com/banking (deep black background, card grid layouts, sleek neon-green highlights `#00c805`, clear sans-serif typography, and glassmorphic panels).

### R2. Rebuilding Legacy Web Games
Rebuild the 4 legacy games (2048, Clumsy Bird, Hextris, Pac-Man) as native WebGL/Three.js/Phaser hybrid modules integrated cleanly into the folder structure. They must use low-poly flat-shaded 3D geometries and include custom touch controls.

### R3. Mobile Optimization & Controls
All games must fit within mobile viewports, respect safe-area layout bounds, handle orientation changes cleanly, and utilize optimized touch gestures (such as drag-to-steer/move, joysticks, or debounced swipes) and custom sound effects.

### R4. Performance Guardrails (WebGL / 60 FPS)
Any WebGL/3D environments must implement efficient instancing (`InstancedMesh` / Instanced Buffer Geometry) for repetitive background elements or obstacles, and cleanly dispose of retired assets to maintain a locked 60 FPS in standard mobile browsers.

## Verification Resources

You can verify the build and runtime controls using the following package commands:
- **Build Verification:** `npm run build`
- **Smoke Tests:** `npm run smoke`
- **Touch Playtests:** `npm run touch:all`

## Acceptance Criteria

### Hub UI & Styling
- [ ] The hub page exhibits a consistent black/dark-mode theme with green accents and glassmorphic cards.
- [ ] Hover states and touch taps trigger animated micro-interactions.
- [ ] Standardized overlays (Pause, Game-Over, Victory) are shared across all 9 games.

### Rebuilt / Ported Games
- [ ] 2048, Clumsy Bird, Hextris, and Pac-Man are selectable native scenes without external redirects.
- [ ] Clumsy Bird 3D operates as a smooth low-poly runner using WebGL and physics.
- [ ] Hextris and 2048 render and transition in orthographic 3D.
- [ ] Pac-Man features neon walls and 3D ghost models.

### Responsiveness & PWA
- [ ] All 9 games scale responsively on narrow viewports without clipping interactive controls or UI text.
- [ ] The application registers a Service Worker and functions offline.
- [ ] No raw DOM touch listeners leak across scene transitions.
- [ ] `npm run build` and `npm run touch:all` complete successfully without errors.

## Follow-up — 2026-07-11T18:16:09Z

Refactor the gameplay mechanics, controls, and physics configurations of the 5 custom Phaser games in the Weekly Game Factory compilation folder.

Working directory: `/Users/apexclaw/Projects/weekly-game-factory`
Integrity mode: development

## Requirements

### R1. F1 Space Invaders Polish
- Implement a 2-second player respawn invulnerability window where incoming collisions are ignored and the car flashes visually.
- Verify standard pause overlays function correctly and suspend active enemy shoots.

### R2. Cosmic Cargo Refactoring
- Integrate physics-based cargo/asteroid collision handling (Matter.js or Arcade equivalent).
- Reposition the fuel HUD bar layout dynamically using safe-area viewport boundaries.
- Debounce gravity flip gestures (e.g. 200ms delay) to prevent accidental double-swiping.

### R3. Contra Bonus Momentum & Touch Controls
- Add horizontal air damping so horizontal movement in mid-air feels natural rather than overriding horizontal velocity instantly.
- Implement standard virtual touch joystick overlays on mobile viewports for clean diagonal/vertical aiming.

### R4. Asteroid Belt Safe Hyperspace
- Replace the hardcoded `12%` chance of instant self-destruction on hyperspace exit with a coordinate scanner that avoids teleporting directly on top of active asteroids.

### R5. Red Bull Pong Difficulty Scaling
- Scale paddle dimensions dynamically on wide aspect ratios to balance defense.
- Cap the AI minimum reaction delay and introduce target error wobble scaling with ball speed to ensure high rounds remain beatable.

## Verification Resources

You can verify the build and runtime controls using the following package commands:
- **Build Verification:** `npm run build`
- **Smoke Tests:** `npm run smoke`
- **Touch Playtests:** `npm run touch:all`

## Acceptance Criteria

### Space Invaders
- [ ] Respawning F1 car does not take damage from active enemy bullets for the first 2 seconds.
- [ ] During invulnerability, the car's visual opacity flashes.

### Cosmic Cargo
- [ ] Swiping gravity rapidly in succession only registers one flip every 200ms.
- [ ] The fuel bar repositions cleanly next to HUD elements on different screen aspect ratios.

### Contra Bonus
- [ ] Jumping and changing direction maintains smooth aerial momentum instead of snapping immediately.
- [ ] A virtual joystick allows steering and 8-directional aiming on mobile devices.

### Asteroids
- [ ] Using Hyperspace never teleports the player directly onto or within collision range of an active asteroid.

### Pong
- [ ] AI opponent is beatable on round 8+ due to added reaction lag and target error scaling.
- [ ] Paddle scales proportionally on wide screens to prevent corner defense gaps.

## Follow-up — 2026-07-12T02:32:10Z

Hi Team! Phase 2 has been fully validated and victory has been confirmed. The user approved proceeding to the next step.

Please launch Phase 3: WebGL Rebuild of Legacy Games. 
- Rebuild the 4 legacy games (2048, Clumsy Bird, Hextris, Pac-Man) as native WebGL/Three.js/Phaser hybrid modules integrated cleanly into the folder structure. They must use low-poly flat-shaded 3D geometries and include custom touch controls.
- Keep performance guardrails in place: use InstancedMesh for repetitive background/obstacles and clean up retired objects to maintain a locked 60 FPS on mobile.

Proceed with implementation and let us know when you begin or if you need any resources.


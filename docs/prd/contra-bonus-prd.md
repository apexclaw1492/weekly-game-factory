# Product Requirements: Contra Bonus

## Product Summary

Contra Bonus is a side-scrolling run-and-gun arcade game inspired by Contra. The target experience is fast, readable, and strict: run, jump, aim, fire, collect weapons, survive one-hit deaths, and defeat a boss.

## Current Implementation

Source: `src/scenes/ContraScene.ts`

Implemented:

- Side-scrolling level with camera follow.
- Player can move left/right, jump, and shoot.
- Rifle and spread weapon exist.
- Enemy waves spawn based on player x-position.
- Soldiers, flyers, turrets, heavy enemies, capsules, and boss exist.
- Player has 3 lives and loses weapon on death.
- Boss has HP, movement, attack phases, hit flash, and victory flow.
- Touch play uses drag or tilt for run/aim, swipe-up for jump, and automatic fire while engaged.

## Arcade Reference Target

Classic Contra requirements:

- Run-and-gun side-scrolling action.
- Eight-direction firing is central to skill expression.
- One hit kills the player and removes the current weapon.
- Weapon capsules provide upgrades.
- Two-player simultaneous co-op was a major arcade feature.
- Boss encounters are readable, phase-based, and pattern-driven.

Reference: https://en.wikipedia.org/wiki/Contra_%28video_game%29

## Problems To Fix

### Functional Bugs

- Touch gestures must remain screen-space and must not create camera-scrolling overlay artifacts.
- Fixed `groundY = 530` breaks short landscape layouts.
- Resize handler only adjusts HUD, not ground, camera bounds, world bounds, platforms, boss arena, or player visibility.
- Jump uses held `aPressed` as a just-pressed event, so holding jump can retrigger on landing.
- Down/aim intent must be documented for gesture and tilt inputs.
- Bullet cleanup only checks horizontal bounds; upward shots can leak offscreen.
- Resize listeners and input listeners must be explicitly cleaned up.
- Star arrays can accumulate across restarts.

### Arcade Fidelity Gaps

- No full 8-direction firing.
- No crouch/prone behavior.
- No downward or diagonal-down firing.
- Only rifle and spread exist.
- Enemy waves are mostly same-edge spawns rather than authored arcade pacing.
- No co-op.
- Boss and level structure are simplified.

## Product Goals

- Make single-player Contra-style play reliable on mobile first.
- Preserve arcade skill: simultaneous move, aim, jump, and fire.
- Keep touch controls fixed and usable during camera scrolling.
- Make landscape and portrait both playable, with layout adjustments instead of clipped world geometry.

## Non-Goals

- Exact Contra stage reproduction.
- Licensed art or characters.
- Co-op in the first stabilization pass.

## Gameplay Requirements

### Movement

- Player moves left/right.
- Player jumps with a clear just-pressed action.
- Player can crouch or go prone if `down` is held on ground.
- Player can aim while standing, running, jumping, and crouching.
- Player has one-hit death with temporary respawn invulnerability.

### Shooting

- Minimum required directions for first fidelity pass:
  - left
  - right
  - up
  - up-left
  - up-right
  - down while airborne
  - down-left while airborne
  - down-right while airborne
- Fire rate must be weapon-specific.
- Rifle is default.
- Spread is a pickup and is lost on death.
- Additional weapons should be planned but not required for first pass: machine gun, laser, fireball.

### Level And Enemies

- Enemy spawns must be telegraphed and paced.
- Enemies must not spawn directly inside the player.
- Turrets and flyers must have readable firing patterns.
- Boss must have clear hitbox, health feedback, attacks, phase changes, and victory state.

## Touch Requirements

### Portrait And Landscape

- Drag controls run direction and aim vector.
- Tilt can move/aim hands-free after motion permission.
- Swipe up triggers jump as a just-pressed action.
- Firing is automatic while engaged so movement and aiming remain playable on a phone.
- No visible D-pad, A/B, or auto-fire toggle labels.
- Ground, player, camera framing, and boss attacks must remain readable in both orientations.

## Acceptance Criteria

- Game is playable from start through boss defeat on desktop, phone portrait, phone landscape, tablet portrait, and tablet landscape.
- Touch gestures remain screen-space during scrolling and after rotation.
- Player can move, aim, jump, and fire simultaneously on touch.
- Holding jump does not repeatedly auto-jump on landing.
- Down input has documented behavior.
- Offscreen bullets and enemies are cleaned up in both axes.
- Player, ground, enemies, platforms, and boss remain visible after resize.
- Weapon pickup is readable, changes weapon, and is lost on death.
- Boss can be hit consistently and defeated.
- No console errors during start, play, resize, death, retry, victory, and return to hub.

## Implementation Notes

- Keep touch gestures screen-space and invisible rather than rendering a control overlay.
- Replace direct `aPressed` jump with normalized `jump.justPressed`.
- Add aiming resolver based on action vector and player state.
- Rework `groundY` and camera/world bounds through a scrolling-platformer layout profile.
- Add vertical bullet cleanup.
- Add authored enemy-wave data with pacing and screen-entry rules.

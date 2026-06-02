# Mobile Arcade Acceptance Criteria

Published target: iPhone-first arcade play that also works on desktop.

## Global Criteria

1. Gameplay cannot depend on labeled virtual D-pad, fire, boost, or direction buttons.
2. Every game must support one-handed or two-thumb touchscreen play using direct gestures: tap, hold, drag, swipe, or multi-touch.
3. Every game should request and use device motion where it improves the loop, with touch gestures as the fallback.
4. Haptic feedback should fire on meaningful physical actions when the device supports vibration.
5. Portrait and landscape must both preserve readable HUD, playable space, and reachable interactions.
6. Desktop keyboard controls must remain available for automated smoke tests and local development.
7. The hub can remain tappable for game selection, but in-game control surfaces should be invisible or diegetic rather than button overlays.
8. The smoke test must launch all published games across desktop, phone portrait, and phone landscape without console errors.

## Game Criteria

### F1 Space Invaders

- Mobile movement uses drag or tilt for lateral aim.
- Holding the screen fires; tapping still starts/restarts.
- No visible FIRE, LEFT, or RIGHT buttons.

### Cosmic Cargo

- Mobile gravity flips use tilt as the primary input and swipe as the fallback.
- Holding the screen boosts; releasing returns to drift.
- No visible gravity direction buttons or BOOST button.

### Contra Bonus

- Mobile run/aim uses drag or tilt.
- Swipe up jumps.
- Firing is automatic while engaged so the player can focus on movement and aiming.
- No D-pad or A/B labels.

### Asteroid Belt

- Mobile steering uses tilt or drag.
- Swipe up thrusts.
- Touch defaults to autofire, with multi-touch available for burst fire.
- No visible rotate, thrust, fire, or auto labels.

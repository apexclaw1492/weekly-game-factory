# Progress — Worker Hextris Rebuild

## Current Status
Last visited: 2026-07-11T12:26:00Z
- [ ] Read legacy JS/HTML files for hextris in `public-safe/games/hextris/`
- [ ] Create `src/scenes/HextrisScene.ts` as a native Phaser/Three.js hybrid scene
- [ ] Implement orthographic 3D rotating hexagon, falling colored bars, matching logic
- [ ] Map drags/swipes or lateral taps (left/right of screen) from ArcadeInputFrame to rotate hexagon
- [ ] Implement asset disposal and standard overlays (Pause, Game-Over, Victory)
- [ ] Register in `src/main.ts` and `src/data/gameCatalog.ts` (remove url, set sceneClass/sceneKey)
- [ ] Verify build and local playability

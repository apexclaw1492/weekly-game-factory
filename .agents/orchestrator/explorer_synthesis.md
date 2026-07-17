# Explorer Synthesis Report: Milestone 4 (Pac-Man 3D Maze Instancing & Disposal)

## Consensus
All three explorers agreed on the core optimization and memory leak mitigation strategies:
1. **InstancedMesh Consolidation**: Consolidate repetitive walls, dots, and power pellets into three separate `THREE.InstancedMesh` instances (one per type) to reduce draw calls from ~224 to exactly 3.
2. **Persistent Asset Lifecycle**: Geometries and materials must be created exactly once (in `create()`), stored as class properties, and reused. The current implementation in `resetGameplay()` leaks memory by continuously recreating geometries and materials on game resets.
3. **Safe Resource Disposal**: All unique geometries, materials, and the WebGL renderer must be cleanly disposed of exactly once in `destroySceneResources()`. No mid-game buffer deletions or `.dispose()` calls should be performed when entities are eaten.
4. **Collectible Hiding**: Eaten dots and pellets should be visually hidden by scaling their instance matrices to `(0, 0, 0)` or translating them offscreen (e.g., `y = -999.0`), followed by flagging `needsUpdate = true` on the instanced mesh.

## Resolved Conflicts

### Touch Steering threshold configuration
- **Explorer 1 & 3**: Recommends replacing normalized `dragVectorX/Y` checks with raw pixel checks (`frame.touch.dx/dy`) against the original threshold of `18` pixels.
- **Explorer 2**: Recommends keeping `dragVectorX/Y` and reducing the threshold from `18` to `0.15` (normalized).
- **Resolution**: We will adopt raw pixel checks (`frame.touch.dx/dy`) against the threshold of `18` pixels. Checking normalized vectors against a constant value (e.g., `0.15`) scales with canvas size, making the swipe distance too long on high-resolution screens. Checking raw pixels offers a consistent, screen-size independent user experience.

## Gaps
None. All requirements of Milestone 4 are covered.

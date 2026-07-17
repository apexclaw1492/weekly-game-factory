---
name: game-prompting
description: Use this skill to structure AI prompts for 3D browser games using the most effective technical keywords for Three.js, performance, and physics.
---

# Game Prompting Best Practices

Based on the guide to building AI games, you do not need to know how to code to build 3D browser games with AI—you just need to know the exact **technical keywords** to trigger the right behavior.

When generating or modifying 3D web games, always apply these key concepts:

1. **Specify Precise Visual Style Words**
   A single word completely changes a game's presentation. Swap generic terms for precise styles:
   - `low poly`
   - `pixel art`
   - `voxel`
   - `cell shaded`
   - `isometric`

2. **Explicitly Invoke `Three.js`**
   Naming `Three.js` explicitly (along with terms like *cameras*, *materials*, *shaders*, or *particles*) drastically improves structural code quality for 3D browser games.

3. **Prompt Using Screenshots**
   If you have a game dynamic or layout reference, use screenshots. Visual context combined with technical keywords yields the best results for cloning mechanics or styles.

4. **Use Established Genre Names**
   Naming a classic genre (e.g., `endless runner`, `tower defense`, `platformer`) instantly tells the AI how to structure complex foundational loops, map generation, and core mechanics.

5. **Prevent Browser Crashes with Instancing**
   Never render massive quantities of duplicate objects individually. Always use **`instance buffer geometry`** (or `InstancedMesh`) to force the engine to render millions of objects (like grass, leaves, debris) efficiently in a single draw call.

6. **Outsource Movement to Physics Libraries**
   Never attempt to program gravity or collisions manually. Explicitly instruct the use of established libraries to instantly gain realistic mechanics:
   - `MatterJS` (for 2D)
   - `CannonJS` (for 3D lightweight physics)
   - `AmmoJS` (for advanced 3D physics)

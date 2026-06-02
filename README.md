# Weekly Game Factory

> A growing browser arcade hub for small weekly games.

## How It Works

- **Every Friday**: Add or polish a small browser game
- **Every Month**: Upgrade previous games
- **Mobile first**: Playable with touch controls and keyboard controls

## Built With

- Phaser 3 for game scenes, physics, input, and rendering
- Vite + TypeScript for local development and production builds
- Procedural textures and synthesized sound effects
- Hosted on GitHub Pages

## Project Layout

- `src/data/gameCatalog.ts`: the single source of truth for games shown in the hub and registered with Phaser
- `src/scenes/`: hub, boot/preload, and individual game scenes
- `src/objects/`: shared gameplay objects such as touch controls
- `src/utils/`: shared helpers for textures and sound
- `scratch/`: local QA scripts and reference screenshots
- `templates/`: starter files for standalone game experiments

## Local Commands

```sh
npm run dev
npm run build
npm run preview
npm run smoke
npm run touch:f1
```

## Rebuild Docs

The mobile-first rebuild plan lives in `docs/rebuild/README.md`. Start there for the master PRD, input architecture, QA plan, backlog, status board, and subagent playbook.

## Latest Game

Check the [hub page](https://apexclaw1492.github.io/weekly-game-factory/) for this week's game.

## Mission

One new game. Every week. Forever.

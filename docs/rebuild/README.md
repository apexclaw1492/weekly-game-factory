# Mobile Arcade Rebuild Docs

This folder is the control center for rebuilding Weekly Game Factory into a set of operational, mobile-first arcade games.

## Read Order

1. `master-prd.md`: product vision, scope, non-goals, certification rules, and release policy.
2. `mobile-input-architecture.md`: the shared hardware-first input contract every game must use.
3. `qa-and-playtest-plan.md`: browser-player, QA, and live-site verification requirements.
4. `backlog.md`: prioritized implementation backlog with acceptance criteria.
5. `status-board.md`: current game certification status and next milestones.
6. `subagent-playbook.md`: exact roles for design, implementation/player, and QA agents.

## Current Product Decision

Stop patching four independent keyboard-style scenes. Rebuild each game against one shared mobile arcade runtime:

- One normalized input layer.
- One scene lifecycle contract.
- One viewport/layout service.
- One QA state contract.
- One certification gate before a game is advertised as playable.

## Release Rule

A game is not considered playable until it passes the mobile certification gate in portrait and landscape on the deployed GitHub Pages build.

# Subagent Playbook

## Purpose

Subagents must produce evidence that moves the game toward certification. They should not only generate opinions, screenshots, or vague reports.

## Agent Roles

### Design Agent

Mission:

- Define the intended mobile gameplay before code changes.

Inputs:

- Master PRD.
- Individual game PRD.
- Current status board.
- Browser-player failure report.

Required output:

- Game-specific control map.
- Core loop.
- Mobile portrait and landscape behavior.
- Acceptance criteria.
- Edge cases.
- What must be tested.

The design agent must not:

- Approve a visible virtual-button scheme as the primary mobile control.
- Ignore the original arcade contract where one exists.
- Skip portrait or landscape.

### Implementation Or Browser-Player Agent

Mission:

- Play and inspect the game in a browser like a mobile user.

Inputs:

- Design agent output.
- Current code.
- QA plan.

Required output:

- Commands run.
- Orientation tested.
- Gestures performed.
- Before/after QA state.
- Screenshots only as supporting evidence.
- Clear pass/fail for each acceptance criterion.

The browser-player agent must not:

- Treat screenshots as enough proof.
- Use mouse clicks when the requirement is touch.
- Skip the deployed GitHub Pages build when release validation is requested.

### QA Agent

Mission:

- Decide whether the game is certified, blocked, or still rebuilding.

Inputs:

- Design agent output.
- Browser-player report.
- Test output.
- Product docs.

Required output:

- Go/no-go decision.
- Findings ordered by severity.
- Missing tests.
- Evidence links or paths.
- Required fixes before certification.

The QA agent must reject:

- Render-only success.
- Partial orientation success.
- Input behavior that depends on raw scene hacks.
- Any claim that all games work without `touch:all` evidence.

## Required Workflow

1. Design agent writes or updates the game design brief.
2. Implementation work updates the game against the shared runtime.
3. Browser-player agent tests local portrait and landscape.
4. QA agent reviews evidence.
5. Fixes are applied.
6. Browser-player agent tests again.
7. QA agent approves local certification.
8. Release is pushed.
9. Browser-player agent tests GitHub Pages.
10. QA agent approves deployed certification.

## Standard Report Template

```md
# Agent Report: <Game> <Role>

## Decision

Go / No-go / Blocked

## Scope

- Game:
- Version:
- URL:
- Viewports:

## Evidence

- Commands:
- State snapshots:
- Screenshots:

## Findings

- P0:
- P1:
- P2:

## Required Next Work

- Item 1
- Item 2
```

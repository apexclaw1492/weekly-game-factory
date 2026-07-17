# BRIEFING — 2026-07-12T02:32:25Z

## Mission
Rebuild the 4 legacy games (2048, Clumsy Bird, Hextris, Pac-Man) as native WebGL/Three.js/Phaser hybrid modules with performance optimization (InstancedMesh, asset disposal, custom touch controls).

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator
- Original parent: top-level
- Original parent conversation ID: 98b1c424-51a6-40a7-bf80-5cd9e97554b7

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator/PROJECT.md
1. **Decompose**:
   - Milestone 1: 2048 3D Optimization & Performance Guardrails
   - Milestone 2: Clumsy Bird 3D Pipe Instancing & Disposal
   - Milestone 3: Hextris 3D Block Instancing & Disposal
   - Milestone 4: Pac-Man 3D Maze Instancing & Disposal
   - Milestone 5: Verification & Forensic Audit
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Spawn workers/sub-orchestrators for milestones.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor, exit.
- **Work items**:
  1. Milestone 1: 2048 3D Optimization & Performance Guardrails [done]
  2. Milestone 2: Clumsy Bird 3D Pipe Instancing & Disposal [done]
  3. Milestone 3: Hextris 3D Block Instancing & Disposal [done]
  4. Milestone 4: Pac-Man 3D Maze Instancing & Disposal [pending]
  5. Milestone 5: Verification & Forensic Audit [pending]
- **Current phase**: 1
- **Current focus**: Milestone 4 (Pac-Man)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/ folder.
- If Forensic Auditor reports INTEGRITY VIOLATION, advance fails.
- Self-succeed at 16 spawns.

## Current Parent
- Conversation ID: 98b1c424-51a6-40a7-bf80-5cd9e97554b7
- Updated: not yet

## Key Decisions Made
- Use Project Pattern to structure the work across milestones for the 4 legacy games.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_2048_1 | teamwork_preview_explorer | Explore 2048 WebGL/Three.js optimization | completed | f381b945-3258-433a-a08d-5eb64dec556e |
| explorer_2048_2 | teamwork_preview_explorer | Explore 2048 WebGL/Three.js optimization | completed | 9b1175d8-b672-4b0c-a2f6-676f89c2894f |
| explorer_2048_3 | teamwork_preview_explorer | Explore 2048 WebGL/Three.js optimization | completed | 70cb784d-5670-4d57-a4f5-966349da9614 |
| worker_2048 | teamwork_preview_worker | Optimize 2048 WebGL & input responsiveness | completed | 63f8c808-c534-498c-b96e-33f4cb9afa42 |
| reviewer_2048_1 | teamwork_preview_reviewer | Review 2048 optimizations | completed | 73cbf986-7f46-4a3e-b31b-ce06c1bd3330 |
| reviewer_2048_2 | teamwork_preview_reviewer | Review 2048 optimizations | completed | 509f1b5e-b100-4837-bd90-fec2346e5154 |
| challenger_2048_1 | teamwork_preview_challenger | Empirically verify 2048 optimizations | completed | 3b5904db-2d56-4bab-9eeb-8a24f67d74d8 |
| challenger_2048_2 | teamwork_preview_challenger | Empirically verify 2048 optimizations | failed | 9ccf1484-062a-4171-9ce9-4a100c9313c9 |
| auditor_2048 | teamwork_preview_auditor | Forensic audit 2048 optimizations | completed | d6ce1288-6539-4204-bad8-699c3ee31693 |
| worker_clumsy | teamwork_preview_worker | Optimize Clumsy Bird WebGL pipes instancing | completed | c704f9c9-c13a-45a2-9a1e-2bedb8faef7e |
| reviewer_clumsy_1 | teamwork_preview_reviewer | Review Clumsy Bird optimizations | retired | 06bd46a2-9305-4e65-9492-0363d2de1be6 |
| reviewer_clumsy_2 | teamwork_preview_reviewer | Review Clumsy Bird optimizations | completed | b80593c5-50f8-4366-98b8-34a69ea696d8 |
| challenger_clumsy_1 | teamwork_preview_challenger | Verify Clumsy Bird optimizations | retired | 4a052b35-9326-4cb0-ba70-2019309be4c7 |
| challenger_clumsy_2 | teamwork_preview_challenger | Verify Clumsy Bird optimizations | retired | 8236d738-adc5-4204-8a1a-0af6243f7ee8 |
| auditor_clumsy | teamwork_preview_auditor | Forensic audit Clumsy Bird optimizations | completed | e70df553-a0d9-47b2-92bf-cea66215e91f |
| worker_clumsy_retry | teamwork_preview_worker | Fix GridHelper leak & double-flapping | completed | 9b3098ad-dd01-42ad-a80c-fafe3681b183 |
| reviewer_clumsy_retry_1 | teamwork_preview_reviewer | Review Clumsy Bird bugfixes | completed | 88ceb399-943b-4af0-a891-764c18c0a95a |
| reviewer_clumsy_retry_2 | teamwork_preview_reviewer | Review Clumsy Bird bugfixes | completed | fe8850d8-30be-44e3-8ea0-0907afda9d6c |
| challenger_clumsy_retry_1 | teamwork_preview_challenger | Verify Clumsy Bird bugfixes | completed | 4b85a356-f7d8-485a-af60-ffd4bdce7628 |
| challenger_clumsy_retry_2 | teamwork_preview_challenger | Verify Clumsy Bird bugfixes | completed | 1fcc87a0-8bfc-48b5-87d8-3eef1053aaf9 |
| auditor_clumsy_retry | teamwork_preview_auditor | Forensic audit Clumsy Bird bugfixes | completed | 566fe18f-3f25-4ea7-a3a9-8705fced98ed |
| explorer_hextris_1 | teamwork_preview_explorer | Explore Hextris WebGL/Three.js optimization | completed | 14d1168b-27a5-4e19-ab99-a0e158af2b55 |
| explorer_hextris_2 | teamwork_preview_explorer | Explore Hextris WebGL/Three.js optimization | completed | f8e995a2-f62d-4845-a488-7b5a69dd094e |
| explorer_hextris_3 | teamwork_preview_explorer | Explore Hextris WebGL/Three.js optimization | completed | 4f88521e-d2f0-4f72-bda0-74f84b5a0c09 |
| worker_hextris | teamwork_preview_worker | Implement Hextris instancing & resource cleanup | completed | 30970bae-8060-4a8e-8c44-c76f30cea52c |
| reviewer_hextris_1 | teamwork_preview_reviewer | Review Hextris instancing & cleanup | retired | f529270d-b558-42f4-969b-32cf1528e42a |
| reviewer_hextris_2 | teamwork_preview_reviewer | Review Hextris instancing & cleanup | retired | a9a0c0ca-d0c0-470e-b91c-341294b74826 |
| challenger_hextris_1 | teamwork_preview_challenger | Verify Hextris instancing & cleanup | retired | a7a90013-d8e9-4b7c-a829-daa2f9323644 |
| challenger_hextris_2 | teamwork_preview_challenger | Verify Hextris instancing & cleanup | retired | c4937ffa-d1fd-4336-a4e0-ca820754fea3 |
| auditor_hextris | teamwork_preview_auditor | Forensic audit Hextris instancing & cleanup | retired | af3cb39a-e0a9-4ed2-85a6-158ff4a102ef |
| reviewer_hextris_retry_1 | teamwork_preview_reviewer | Review Hextris optimizations | failed | 83d7c29b-0659-4b12-827c-b5c3a6e3860c |
| reviewer_hextris_retry_2 | teamwork_preview_reviewer | Review Hextris optimizations | retired | 6b0b43bf-beb3-4423-965f-0a17bcba33d6 |
| challenger_hextris_retry_1 | teamwork_preview_challenger | Verify Hextris optimizations | retired | 9c40e9c3-f357-4b98-a238-e04237793b95 |
| challenger_hextris_retry_2 | teamwork_preview_challenger | Verify Hextris optimizations | retired | e158eae3-4553-48c6-bf45-0246b051bb04 |
| auditor_hextris_retry | teamwork_preview_auditor | Forensic audit Hextris optimizations | completed | fadd011b-aa8e-439d-8b25-865fbce64e24 |
| worker_hextris_retry | teamwork_preview_worker | Register shutdown cleanup event handlers | completed | fa0c9b1d-1f12-47b9-a7f6-1dc3b5d39528 |
| reviewer_hextris_retry2_1 | teamwork_preview_reviewer | Review Hextris fixes | completed | ef4d82fa-9d84-41b4-b6da-05c1f3c3cdc5 |
| reviewer_hextris_retry2_2 | teamwork_preview_reviewer | Review Hextris fixes | completed | 2ef13e38-f699-4336-b651-b7038ba2fbef |
| challenger_hextris_retry2_1 | teamwork_preview_challenger | Verify Hextris fixes | completed | 088cb5af-284d-4fc9-80d0-c53ac258cf52 |
| challenger_hextris_retry2_2 | teamwork_preview_challenger | Verify Hextris fixes | completed | 149abd55-9b1b-47bd-9a96-74efa153460b |
| auditor_hextris_retry2 | teamwork_preview_auditor | Forensic audit Hextris fixes | completed | 1486efc7-d5dd-429b-8989-046a9c98fb35 |
| explorer_pacman_1 | teamwork_preview_explorer | Explore Pac-Man 3D Maze Instancing | retired | 9cad14e2-5470-4b35-88db-da52fbfb7213 |
| explorer_pacman_2 | teamwork_preview_explorer | Explore Pac-Man 3D Maze Instancing | completed | 74f96a75-de36-4834-b981-0c6ffde7318a |
| explorer_pacman_3 | teamwork_preview_explorer | Explore Pac-Man 3D Maze Instancing | retired | da1460b2-a4c5-4318-92e0-4fa9ada4ec0a |
| worker_pacman | teamwork_preview_worker | Implement Pac-Man 3D Instancing | completed | 9a004087-72b1-4560-b57d-9ce0d373bdfc |
| worker_pacman_retry | teamwork_preview_worker | Implement Pac-Man 3D Instancing | retired | 857363ba-acb8-465a-b28f-1975a19a21b7 |
| reviewer_pacman_1 | teamwork_preview_reviewer | Review Pac-Man optimizations | completed | 3905c2ad-5286-4733-b2f2-035b07cacc17 |
| reviewer_pacman_2 | teamwork_preview_reviewer | Review Pac-Man optimizations | completed | b2d16f37-336e-4194-8066-b7cf350fa905 |
| challenger_pacman_1 | teamwork_preview_challenger | Verify Pac-Man optimizations | completed | 6b4e340b-fd9f-4886-b9aa-d6fc725e0a99 |
| challenger_pacman_2 | teamwork_preview_challenger | Verify Pac-Man optimizations | completed | 68d44b31-0cb6-444e-9792-f99d16031700 |
| auditor_pacman | teamwork_preview_auditor | Forensic audit Pac-Man optimizations | completed | 7b91a298-6d58-4249-858d-35294138ad48 |
| worker_pacman_retry2 | teamwork_preview_worker | Clear geometries/materials dispose arrays on reset | completed | 008ab988-84ea-40ac-924a-80d10e74589c |
| final_reviewer_1 | teamwork_preview_reviewer | Final Phase 3 review | pending | 9c74eda6-25a2-4271-b4a7-e5659fdea07a |
| final_reviewer_2 | teamwork_preview_reviewer | Final Phase 3 review | pending | 2900499c-4a0b-4902-ae6a-db6e0941e0a9 |
| final_challenger_1 | teamwork_preview_challenger | Final Phase 3 verification | pending | a1d6135f-e27e-40e2-8e5a-6a46411c247e |
| final_challenger_2 | teamwork_preview_challenger | Final Phase 3 verification | pending | f3f052f6-3b7b-4a94-b585-a259216c6bc7 |
| final_auditor | teamwork_preview_auditor | Final Phase 3 forensic audit | pending | 34ea544a-787e-4128-9296-ec80c21bc0fd |

## Succession Status
- Succession required: no
- Spawn count: 16 / 16
- Pending subagents: ["9c74eda6-25a2-4271-b4a7-e5659fdea07a", "2900499c-4a0b-4902-ae6a-db6e0941e0a9", "a1d6135f-e27e-40e2-8e5a-6a46411c247e", "f3f052f6-3b7b-4a94-b585-a259216c6bc7", "34ea544a-787e-4128-9296-ec80c21bc0fd"]
- Predecessor: 98b1c424-51a6-40a7-bf80-5cd9e97554b7
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 92d02aef-85d6-472c-8358-94b429a68799/task-21
- Safety timer: none

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator/ORIGINAL_REQUEST.md — Original User Request verbatim
- /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator/BRIEFING.md — My working memory
- /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator/progress.md — Liveness and status heartbeat
- /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator/plan.md — Detailed execution plan
- /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator/PROJECT.md — Project Scope Document

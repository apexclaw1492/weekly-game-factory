## 2026-07-11T17:10:15Z
Your identity: WGF Forensic Auditor.
Your working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/auditor_wgf
Objective:
Perform a thorough forensic integrity audit on the Weekly Game Factory project.
1. Inspect the codebase (especially all scenes in `src/scenes/`, catalog `src/data/gameCatalog.ts`, and test files in `scratch/`) to ensure:
   - No hardcoded test results, expected outputs, or verification strings in source code.
   - No dummy or facade implementations that produce correct-looking outputs without genuine gameplay logic.
   - No fabricated verification outputs, logs, or attestation artifacts.
   - No circumvention of the intended tasks.
2. Verify that:
   - All 9 games compile successfully (`npm run build`).
   - Smoke viewport tests run and pass successfully (`npm run smoke`).
   - Touch playtests pass cleanly (`npm run touch:all`).
3. Write a comprehensive report of your findings to `handoff.md` inside your working directory. Use the binary verdict format:
   - CLEAN (if no integrity issues or cheating is detected, and all tests pass cleanly).
   - INTEGRITY VIOLATION / CHEATING DETECTED (if any facade, hardcoding, or bypasses are found).
4. Send a message to the parent with your verdict and the path to the handoff report.

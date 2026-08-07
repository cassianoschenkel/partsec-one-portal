# Claude Code — Partsec One Portal

Follow `AGENTS.md` first.

Then read the shared project documentation referenced there before changing code.

Claude Code is expected to:
- inspect the existing implementation before editing;
- preserve tenant isolation and server-side authorization;
- use a dedicated branch;
- run lint/build and relevant tests/checks;
- document assumptions and limitations in the PR;
- avoid merging, deploying or modifying production without explicit human approval.

Do not maintain Claude-only architecture rules here. Shared architectural, security and development rules belong under `docs/` so Claude Code, Codex and human reviewers use the same source of truth.

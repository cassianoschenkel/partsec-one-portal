# Partsec One Portal — Agent Instructions

Before making changes, read in order:
1. `docs/PROJECT_RULES.md`
2. `docs/ARCHITECTURE.md`
3. `docs/SECURITY.md`
4. `docs/DEVELOPMENT.md`
5. Relevant implementation and Prisma schema

## Mandatory rules
- Do not modify `main` directly; use a branch and PR.
- Do not merge or deploy without explicit human approval.
- Treat tenant isolation and authorization as hard security boundaries.
- Every privileged Server Action or route handler must authorize server-side; route/layout/UI checks alone are insufficient.
- Never expose or log secrets, passwords, setup tokens or decrypted integration credentials.
- Preserve the snapshot-based integration architecture unless an explicit architectural change is approved.
- Customer-facing terminology should use `SIEM` instead of Wazuh and `Central de Suporte`/`Suporte`/`Chamados` instead of Zammad where practical.
- Claude Code and Codex must not modify the same branch concurrently.

## Next.js rule
This project uses a recent Next.js version with APIs and conventions that may differ from model training data. When working in a local checkout, read the relevant installed documentation under `node_modules/next/dist/docs/` before implementing framework-sensitive behavior and heed deprecation notices.

## Validation
For non-trivial changes, run at minimum:
- `npm run lint`
- `npm run build`

If validation cannot be run, state that explicitly in the PR.

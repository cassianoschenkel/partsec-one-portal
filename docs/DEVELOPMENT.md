# Partsec One Portal — Development Guide

## Prerequisites
- Node.js compatible with the current Next.js/Prisma stack
- npm
- PostgreSQL

Always inspect `package.json`, Prisma configuration and local Next.js documentation for the installed version before assuming framework behavior.

## Setup
1. Install dependencies:
   `npm install`
2. Copy environment template:
   `cp .env.example .env`
3. Configure local values.
4. Apply Prisma migrations as appropriate for the environment.
5. Run the development server:
   `npm run dev`

Do not use production credentials in local development.

## Current npm scripts
- `npm run dev` — Next.js development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint

There is currently no repository-defined automated test script. Until tests are added, lint and build are mandatory baseline validations for non-trivial changes.

## Branch workflow
Do not work directly on `main`.

Suggested prefixes:
- `feat/` new feature
- `fix/` bug fix
- `chore/` maintenance/tooling/documentation
- `security/` security hardening
- `refactor/` behavior-preserving restructuring

One primary coding agent per branch. Claude Code and Codex must not concurrently modify the same branch.

## Before editing
1. Read `AGENTS.md` or `CLAUDE.md` as applicable.
2. Read the shared documents referenced there.
3. Inspect the relevant implementation.
4. Inspect `prisma/schema.prisma` for data-model implications.
5. Identify tenant and authorization impact.

## Next.js version rule
The repository uses a current Next.js version whose APIs may differ from older model knowledge. When local `node_modules/next/dist/docs/` is available, consult the relevant installed documentation before implementing framework-sensitive behavior and honor deprecation notices.

## Prisma changes
For schema changes:
1. Update `prisma/schema.prisma`.
2. Create a migration with a descriptive name.
3. Review generated SQL.
4. Consider existing production data and rollback/recovery.
5. Never reset or destructively recreate a production database as a shortcut.

## Server Actions
Treat Server Actions as API/security boundaries.

Each privileged action must:
- authenticate server-side;
- authorize the role;
- validate tenant ownership/scope;
- validate inputs;
- avoid leaking secrets through errors, redirects or logs.

Prefer shared authorization helpers over duplicated ad-hoc checks.

## Queries
Tenant-facing queries should accept or derive trusted tenant context and scope database access accordingly. Avoid fetching global records first and filtering tenant ownership only in UI code.

## Integrations
External-system clients belong under `src/lib/integrations/`. Synchronization/orchestration belongs under `src/lib/sync/` or another explicit application layer.

Prefer this flow:
external platform -> integration client -> sync/normalization -> tenant-scoped snapshot tables -> portal/report queries.

Avoid introducing direct customer-page dependency on external platform availability unless there is a deliberate architectural decision.

## Customer-facing terminology
Do not expose internal vendor/tool names unnecessarily:
- Wazuh -> SIEM
- Zammad -> Central de Suporte / Suporte / Chamados

Internal admin/engineering code may retain technical names where useful.

## Validation before PR
At minimum:
1. Review diff for accidental secrets.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Exercise affected authentication/authorization paths manually when relevant.
5. Verify tenant isolation for tenant-scoped changes.
6. Verify admin and non-admin behavior when roles are involved.
7. Update documentation if architecture or behavior changed.

If a check cannot be executed, state that explicitly in the PR.

## Pull request expectations
PR description should contain:
- objective;
- main changes;
- security/tenant impact;
- migrations/configuration changes;
- validation performed;
- known limitations or follow-up work.

Large or security-sensitive PRs should be reviewed by a different agent/tool than the one that implemented them, followed by human approval.

## Production changes
Agents must not independently:
- merge to `main`;
- deploy production;
- rotate production secrets;
- modify production firewall/network configuration;
- run destructive database commands;
- change external production integrations in a destructive or irreversible way.

These actions require explicit human authorization and an appropriate rollback plan.

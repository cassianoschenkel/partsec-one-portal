@AGENTS.md

# Partsec One Portal

## 1. Project overview

Partsec One Portal is a multi-tenant B2B portal that aggregates security and
infrastructure data (Zabbix monitoring, Wazuh SIEM) for Partsec's
customers. Each customer ("tenant") sees only its own assets,
vulnerabilities, integrations, and reports. Partsec staff (`PARTSEC_ADMIN`)
manage tenants, integrations, and users across the whole platform.

**Currently operational:**

- Zabbix snapshots/problems
- Wazuh/SIEM agents
- Wazuh/SIEM vulnerabilities
- Integration Health foundation

**Planned / not operational yet:**

- Wazuh alerts/events
- Zammad ticket synchronization (`ZAMMAD` exists only as an
  `IntegrationType` value; there is no Zammad client or sync pipeline)

## 2. Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma ORM 7 (`@prisma/adapter-pg`)
- **Auth:** NextAuth (Auth.js) v5 beta, credentials provider, JWT sessions,
  `bcryptjs` for password hashing
- **Styling:** Tailwind CSS 4
- **Email:** Nodemailer / SMTP
- **Testing:** Node's built-in test runner via `tsx --test`
- **Lint:** ESLint 9 (flat config, `eslint-config-next`)
- **Runtime:** Node 24

This is a recent major version of Next.js with breaking changes from what
training data assumes — see `AGENTS.md` and read
`node_modules/next/dist/docs/` before writing framework-specific code.

## 3. Repository structure

```
auth.ts                     NextAuth config (credentials provider)
prisma/schema.prisma         Data model (source of truth)
prisma/migrations/           Versioned SQL migrations
scripts/                     Operational & dev scripts (see scripts/README.md)
src/app/                     App Router routes
src/app/actions/             Server Actions ("use server")
src/app/api/                 Route handlers (e.g. NextAuth callback)
src/app/(portal)/            Authenticated tenant/admin pages
src/lib/authz/               Authorization rules + server-side enforcement
src/lib/integrations/        External API clients (Zabbix, Wazuh/SIEM)
src/lib/integration-health/  Health/status computation for integrations
src/lib/sync/                Sync pipelines that populate snapshot tables
src/lib/queries/             Shared Prisma query helpers
src/lib/email/               Transactional email sending
src/generated/prisma/        Generated Prisma client (gitignored, do not edit)
```

## 4. Multi-tenant architecture

- `Tenant` is the top-level scoping model. Almost every other model
  (`User`, `CustomerAsset`, `IntegrationConfig`, snapshot tables, `ReportRun`,
  `IntegrationSyncLog`) carries a `tenantId` foreign key with
  `onDelete: Cascade`.
- Tenant-scoped models index `tenantId` (and compound indexes such as
  `[tenantId, integrationType, syncKind, startedAt]`) — keep this pattern
  when adding new tenant-scoped tables.
- `Tenant.slug` is the human-facing identifier used in admin routes
  (`/admin/tenants/[slug]/...`) and in sync entrypoints
  (`syncTenantSiemAgentsBySlug`, etc.).

## 5. Authentication / authorization

- Sessions are JWT-based via NextAuth credentials provider (`auth.ts`).
  `authorize()` looks up the user by email and verifies the bcrypt hash.
- `UserRole` enum: `PARTSEC_ADMIN`, `TENANT_ADMIN`, `TENANT_USER`,
  `READ_ONLY`.
- Authorization lives in `src/lib/authz/`:
  - `rules.ts` — pure, synchronous predicates/assertions
    (`assertActiveUser`, `assertPartsecAdminRole`,
    `assertTenantMutationRole`). These are unit-tested
    (`src/lib/authz/rules.test.ts`) and should stay framework-free.
  - `server-authorization.ts` — async helpers that load the current user
    from the DB session and apply the rules (`requireActiveUser`,
    `requirePartsecAdmin`).
- New authorization checks should be added as rules in `rules.ts` plus
  tests, then wired into `server-authorization.ts` or called directly from
  Server Actions.

## 6. PARTSEC_ADMIN rules

- `PARTSEC_ADMIN` is the only role that can manage tenants, cross-tenant
  users, and global integration configuration.
- `PARTSEC_ADMIN` users have `tenantId: null` — code must not assume every
  user belongs to a tenant.
- Any Server Action or query that touches more than one tenant (tenant
  listing, tenant creation, cross-tenant admin views) must call
  `requirePartsecAdmin()` (or equivalent) before touching the database.

## 7. Tenant isolation rules

- **Never trust a `tenantId` passed in from the client/caller as
  authorization.** A `tenantId` in a form field, query string, or route
  param is a *target*, not a *permission*. The authoritative tenant for a
  mutation is the one on the authenticated session user
  (`requireActiveUser().tenantId`), except for `PARTSEC_ADMIN` acting
  explicitly across tenants.
- Server mutations must self-authorize: re-derive the acting user's role
  and tenant from the session/DB inside the Server Action or query
  function itself, rather than trusting a value threaded through from the
  UI layer.
- When a route param identifies a tenant (e.g. `[slug]`), the handler must
  verify the current user is either `PARTSEC_ADMIN` or belongs to that
  exact tenant before returning/mutating data.

## 8. Prisma and migrations

- Schema lives in `prisma/schema.prisma`; the generated client is emitted
  to `src/generated/prisma` (gitignored — never hand-edit).
- Standard local workflow: edit the schema, then
  `npx prisma migrate dev` (requires human approval — see §14) to create
  and apply a migration file locally, and `npx prisma generate` to refresh
  the client.
- A migration may be **created as a file** and committed, but it must
  never be applied automatically to a shared/production database from an
  agent session. Applying migrations to production is a human action.
- `npx prisma migrate deploy` and `npx prisma db push` are prohibited in
  this workflow (see §15) — they are reserved for the human-run deploy
  process (`scripts/deploy.sh`).
- Safe, read-only/local-generation commands: `npx prisma generate`,
  `npx prisma validate`, `npx prisma format`.

## 9. Integration architecture

- `IntegrationConfig` stores per-tenant, per-`IntegrationType`
  (`ZABBIX`, `WAZUH`, `ZAMMAD`) configuration and `IntegrationStatus`
  (`ACTIVE`, `INACTIVE`, `ERROR`).
- `IntegrationCredential` stores encrypted secrets (via
  `src/lib/crypto.ts`, keyed by `INTEGRATION_CREDENTIALS_SECRET`) linked to
  an `IntegrationConfig`. Never log or persist decrypted credential values.
- `src/lib/integrations/` contains one client module per external system
  (e.g. `zabbix-client.ts`, `siem-client.ts`), responsible for talking to
  the real external API. These clients require live credentials and should
  only be exercised manually against real systems by a human, or against
  mocks in tests.

## 10. IntegrationSyncLog / IntegrationSyncKind

- Every sync pipeline run writes an `IntegrationSyncLog` row: `tenantId`,
  `integrationType`, `syncKind` (`IntegrationSyncKind`:
  `ZABBIX_SNAPSHOT`, `SIEM_AGENTS`, `SIEM_VULNERABILITIES`), `status`,
  optional `message`, `startedAt`/`finishedAt`/`durationMs`.
- `src/lib/integration-health/` derives a health status
  (`HEALTHY`/`STALE`/`DEGRADED`/`ERROR`/`UNKNOWN`/`INACTIVE`/`UNMONITORED`)
  and an activity status (`IDLE`/`RUNNING`/`STUCK`) purely from
  `IntegrationConfig.status` and recent `IntegrationSyncLog` rows — this
  logic is pure and unit-tested (`policy.test.ts`); it must never perform
  a live probe against the external integration just to render a health
  badge in the UI.
- Adding a new sync kind means: extend `IntegrationSyncKind` in the
  schema, write/apply a migration, update the health policy if the new
  kind has different thresholds, and log start/success/failure the same
  way existing pipelines do.

## 11. Sync pipeline conventions

- Sync pipelines live in `src/lib/sync/*.ts` and are triggered either from
  a Server Action (`src/app/actions/sync-actions.ts`) or from a manual
  script in `scripts/` (`sync-zabbix.ts`, `sync-siem-agents.ts`,
  `sync-siem-vulnerabilities.ts`, `import-zabbix-assets.ts`).
- Each pipeline function: records `startedAt`/`Date.now()`, calls the
  relevant integration client, upserts snapshot rows scoped to
  `tenantId`, writes an `IntegrationSyncLog` row on both success and
  failure, and returns a per-tenant result summary.
- These pipelines call real external systems. **Do not execute the sync
  scripts against real integrations from an agent session** — see §15.
  They may be read, modified, and unit-tested (with mocked clients), but
  running them live is a manual, human-triggered operation.

## 12. Server Actions / server authorization

- Server Actions (`"use server"`, in `src/app/actions/`) are the mutation
  boundary. Every Server Action must:
  1. Re-derive the authenticated user via `requireActiveUser()` /
     `requirePartsecAdmin()` — never trust role/tenant info from
     `FormData` or function arguments.
  2. Validate ownership/scope (tenant match, or admin) before reading or
     writing.
  3. Redirect or throw `AuthorizationError` on failure rather than
     silently no-op-ing.
- Keep pure authorization predicates in `src/lib/authz/rules.ts` so they
  stay unit-testable without a database or Next.js runtime.

## 13. Testing conventions

- Test runner: Node's built-in `node --test`, invoked via
  `tsx --test 'src/**/*.test.ts'` (`npm test`).
- Tests are colocated with the code they cover (`foo.ts` /
  `foo.test.ts`), no separate `__tests__` tree.
- Favor pure-function unit tests for authorization rules and health/status
  policy logic — these must not require a database connection.
- The current test suite runs fully offline (no DB, no network); keep new
  tests that way where the logic under test is pure. Integration-style
  tests that need a real database are out of scope for the CI pipeline
  introduced here (see §17).

## 14. Git workflow

- Feature branches off `main`, e.g. `chore/development-automation-foundation`.
- Commits and pushes require human approval in this phase (see §16) — an
  agent session prepares changes but does not commit/push/open PRs itself
  unless the user explicitly runs those steps.
- Never force-push, never rewrite shared/published history.
- Keep commits scoped and descriptive; prefer several focused commits over
  one large one when a change has distinct logical parts.

## 15. Definition of Done

A change is done when:

- `npx prisma format` and `npx prisma validate` pass (if the schema
  changed).
- `npm test`, `npm run lint`, and `npm run build` all pass.
- `git diff --check` reports no whitespace errors.
- Tenant isolation and authorization rules from §6/§7/§12 are respected
  for any new/changed Server Action or query.
- No secrets, `.env` contents, or real credentials were read, printed, or
  committed.
- The diff is reviewed by a human before merge/deploy.

## 16. Autonomous development policy

This project allows an agent session more autonomy for **local
development** while keeping production, secrets, and Git history safe.
Current phase permissions (also enforced by `.claude/settings.json` and
the PreToolUse hook in `.claude/hooks/`):

- **Autonomous (no approval needed):** `npm ci`; read-only Git inspection
  (`git status`, `git diff`, `git log`, `git show`, `git branch
  --show-current`, `git rev-parse`); `npm test`; `npm run lint`;
  `npm run build`; `npx prisma generate`; `npx prisma validate`;
  `npx prisma format`.
- **Requires approval:** `npm install <pkg>` / `npm uninstall`; `git add`;
  `git commit`; `git push` (non-force); branch creation/switching when it
  could discard work; `prisma migrate dev`; any command not explicitly
  covered by the allow list.
- **Prohibited outright:** see §17/§18.
- **Blocked scripts are never run by the agent.** In the current phase,
  any command/script denied by `.claude/settings.json` or the PreToolUse
  hook (see §18) must not be executed by the agent, even if the human
  approves it in the prompt. If one of them is needed, the human runs it
  manually, outside the autonomous session.

The agent may prepare code, migration files, and PR content; a human
performs the actual merge, deploy, and any operation on production or
real external integrations.

## 17. Security constraints

- Never trust a caller-supplied `tenantId` as authorization (§7).
- Never log, print, or persist decrypted integration credentials or SMTP
  passwords.
- Never read the real `.env`/`.env.*` files (`.env.example` is fine to
  read/edit). Use explicit dummy environment variables for local
  build/test verification instead (see §18 for the exact values used in
  CI).
- Never run integration sync scripts against real external systems from
  an agent session — only a human triggers those manually, and only pure
  logic (health policy, snapshot upserts against a test DB) should be
  exercised by tests.

## 18. Production safety

Explicitly prohibited in an agent session, regardless of local
`settings.local.json` history:

- `sudo` (any invocation).
- `npx prisma migrate deploy`.
- `npx prisma db push`.
- Running `scripts/deploy.sh` or `scripts/backup-db.sh`.
- `git push --force` / `--force-with-lease`.
- `git reset --hard`.
- Destructive `git clean` (`-f`, `-fd`, `-fdx`).
- `psql`, `pg_dump`, `pg_restore` against any database.
- Any script that configures real credentials, changes a real password, or
  sends real email (`scripts/set-initial-passwords.ts`,
  `scripts/set-user-password.ts`, `scripts/set-siem-credentials.ts`,
  `scripts/bootstrap-admin.ts`). If needed, the human runs them manually
  outside the agent session.
- Manual execution of the sync scripts
  (`scripts/sync-zabbix.ts`, `scripts/sync-siem-agents.ts`,
  `scripts/sync-siem-vulnerabilities.ts`,
  `scripts/import-zabbix-assets.ts`,
  `scripts/debug-zabbix-problem-hosts.ts`) against real integrations.

These are enforced both by `.claude/settings.json` permission rules and by
a `PreToolUse` hook (`.claude/hooks/`) that blocks the command patterns
even if a stale local `allow` entry exists. Older/stale local settings
files (e.g. `settings.local.json` or backups of it) may exist on a
developer machine; they are not a source of authority for this policy.

## 19. Explicitly prohibited operations (this PR and going forward)

Everything in §18 remains prohibited for an agent session, with no
exception: a human instruction in the prompt does not unlock it. If one of
those operations is needed, the human runs it manually outside the
autonomous session.

The remaining items below are only out of scope for the current phase.
They may be done in a separate change explicitly approved by a human:

- Installing or configuring the GitHub CLI (`gh`) as a dependency of this
  workflow, the Claude GitHub App, or Claude GitHub Actions agent.
- Configuring branch protection or Dependabot.
- `npm audit` remediation as a side effect of unrelated work.
- Functional changes to the portal, application migrations, or database
  schema changes bundled into an unrelated change.

## 20. PR/review workflow

- Use `.github/pull_request_template.md` when opening a PR: Summary,
  Scope, Database/migration impact, Security/tenant impact, Tests,
  Validation, Out of scope, Deployment notes.
- Use `.github/ISSUE_TEMPLATE/feature.md` for new feature issues:
  Objective, Context, Acceptance criteria, Out of scope, Security/tenant
  impact, Database impact, Integration impact, Required tests.
- CI (`.github/workflows/ci.yml`) runs on pull requests targeting `main`:
  install, Prisma generate/validate, test, lint, build, `git diff
  --check` — all against dummy environment variables, no real database or
  external service.
- Merge and deploy remain human-triggered actions outside this workflow.

## Standard validation commands

```bash
npx prisma format
npx prisma validate
npm test
npm run lint
npm run build
git diff --check
```

# Technical Assessment — 2026-08-07

## Scope
Initial repository assessment focused on project structure, stack, authentication, authorization, multi-tenancy, integrations, secrets and development governance. No production behavior was changed in this assessment.

## Current strengths
- Explicit multi-tenant data model with `Tenant` and tenant-owned entities.
- Clear global and tenant role model: `PARTSEC_ADMIN`, `TENANT_ADMIN`, `TENANT_USER`, `READ_ONLY`.
- Auth.js credentials flow rejects inactive users and users without password hashes.
- Integration credentials are stored separately and encrypted with AES-256-GCM.
- Snapshot models decouple customer views/reporting from direct dependence on external monitoring/SIEM availability.
- Dedicated integration clients exist for Zabbix and SIEM components.
- Global admin user actions already demonstrate a robust server-side authorization helper pattern.

## Priority findings
### P1 — Authorization consistency in Server Actions
Some privileged tenant administration actions perform database mutations without the same explicit server-side admin authorization pattern used in `admin-user-actions.ts`.

Examples observed in `tenant-actions.ts` include tenant creation, tenant-user creation, asset creation and integration configuration/credential updates before an explicit equivalent guard is visible. Other functions in that file do perform a `PARTSEC_ADMIN` check, confirming inconsistent enforcement.

Recommended next change: create centralized authorization helpers and apply them consistently to all privileged Server Actions, with negative tests.

### P1 — Cross-tenant authorization tests are absent
The repository currently has no test script in `package.json`. Tenant isolation is a primary security boundary, so the project needs automated tests that prove one tenant cannot read or mutate another tenant's resources.

### P2 — Role behavior is not formally tested
`READ_ONLY`, `TENANT_USER` and `TENANT_ADMIN` exist in the schema, but mutation/read permissions should be defined and tested explicitly as features are implemented.

### P2 — Invitation/setup-token exposure review
Tenant-user creation currently builds a password setup token and includes it in a redirect query parameter used by the admin workflow. This may be operationally intentional, but token exposure through browser history, logs, analytics or screenshots should be reviewed and minimized.

### P2 — Documentation gap
Before this branch, the repository README was still the default create-next-app README, `CLAUDE.md` only referenced `AGENTS.md`, and `AGENTS.md` contained only a Next.js-version warning. Core architectural and security invariants were therefore not available as repository-local source of truth.

### P3 — CI/CD and deployment controls undocumented
The repository does not currently describe CI checks, branch protection, production deployment, rollback or production security controls.

### P3 — Test strategy missing
No repository-defined automated test command is present. A future test strategy should cover unit, integration and authorization/tenant-isolation scenarios.

## Recommended hardening sequence
1. Centralize authorization helpers.
2. Guard all privileged Server Actions and tenant-scoped mutations.
3. Add authorization and cross-tenant negative tests.
4. Define role capabilities and test them.
5. Review password setup-token exposure and lifecycle.
6. Add CI for lint, build and tests.
7. Document deployment, rollback and production security controls.

## Governance established by this branch
This branch adds shared documentation for human developers, Claude Code and Codex:
- `docs/PROJECT_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT.md`
- updated `AGENTS.md`
- updated `CLAUDE.md`

The goal is to keep architecture and security rules tool-neutral and repository-local.

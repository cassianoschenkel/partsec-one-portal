# Partsec One Portal — Project Rules

## Purpose
This repository contains the customer-facing Partsec One Portal. It is a multi-tenant application that exposes operational information to customers while keeping global administration under Partsec control.

## Source of truth
Before changing code, read:
1. `docs/PROJECT_RULES.md`
2. `docs/ARCHITECTURE.md`
3. `docs/SECURITY.md`
4. `docs/DEVELOPMENT.md`
5. Relevant code and Prisma schema

Repository documentation and code override assumptions from model training or prior conversations.

## Product terminology
Customer-facing UI should avoid exposing internal product/vendor names unless explicitly required.
- Wazuh => `SIEM`
- Zammad => `Central de Suporte`, `Suporte` or `Chamados`
- Vendor/tool names may remain in internal/admin-only areas where operationally necessary.

## Multi-tenancy invariants
- Tenant-scoped users must only access data for their own `tenantId`.
- `PARTSEC_ADMIN` is global and normally has `tenantId = null`.
- `TENANT_ADMIN`, `TENANT_USER` and `READ_ONLY` are tenant-scoped roles.
- Every tenant-scoped read or write must constrain access using the authenticated user context, not only route parameters or form input.
- Never trust `tenantId`, tenant slug, asset id, integration id or similar identifiers supplied by the client without server-side authorization.

## Authorization
- Authentication is not authorization.
- Every Server Action and route handler that reads or changes privileged data must perform its own server-side authorization check.
- Admin-only operations must verify an active `PARTSEC_ADMIN` account.
- Do not rely only on `src/proxy.ts`, layouts or hidden UI elements as security boundaries.

## Database and migrations
- Prisma schema is the authoritative data model.
- Schema changes require a migration.
- Never edit production data or migrations destructively without an explicit migration/rollback plan.
- Preserve tenant isolation in indexes, unique constraints and queries.

## Integrations and secrets
- Integration credentials are secrets.
- Never log, return to the browser, commit or expose decrypted credentials.
- Use the existing encryption mechanism for persisted integration credentials.
- Secrets belong in environment variables or encrypted storage, never source code.

## Agent workflow
- Claude Code and Codex may both work on this repository, but must not modify the same branch concurrently.
- Large features: implement with one agent, review with the other.
- Agents may create branches, code, tests and draft PRs when authorized.
- Agents must not merge to `main`, deploy to production, rotate secrets, alter production infrastructure or perform destructive database actions without explicit human approval.

## Change discipline
For non-trivial changes:
1. Identify affected tenant/security boundaries.
2. Inspect current implementation before editing.
3. Make the smallest coherent change.
4. Run lint/build and relevant tests.
5. Document behavioral or architectural changes.
6. Use a PR; do not push directly to `main`.

## Definition of done
A change is not complete until:
- authorization and tenant isolation were considered;
- lint/build pass or failures are documented;
- migrations are included when required;
- sensitive data is not exposed;
- customer-facing terminology is consistent;
- documentation is updated when behavior or architecture changed;
- the change is reviewed before merge.

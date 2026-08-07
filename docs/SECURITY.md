# Partsec One Portal — Security Rules and Assessment

## Security model
The primary security boundaries are:
1. Authentication
2. Role-based authorization
3. Tenant isolation
4. Secret handling
5. Controlled external integrations

Security checks must execute on the server. Client-side visibility, route naming and UI controls are not authorization mechanisms.

## Authentication
Current authentication uses Auth.js/NextAuth credentials with JWT sessions. The authenticated session includes user id, e-mail, role and `tenantId`.

Authentication must reject:
- nonexistent users;
- inactive users;
- users without a configured password;
- invalid passwords.

## Authorization requirements
### Global administration
Operations under global administration must require an active `PARTSEC_ADMIN` server-side.

### Tenant operations
Tenant-scoped operations must establish the authenticated actor and authorize that actor for the target tenant and operation.

Never accept a tenant slug/id from a caller as proof that the caller belongs to that tenant.

### Server Actions
Every Server Action is an externally invokable server boundary and must perform authorization itself.

Do not assume that an action is safe because:
- its form is only rendered on an admin page;
- `src/proxy.ts` protects `/admin`;
- a parent layout validates a session;
- the button is hidden from unauthorized users.

## Current assessment finding: inconsistent guards
`src/app/actions/admin-user-actions.ts` contains a strong pattern: `requirePartsecAdmin()` reloads the user from the database and verifies authentication, active status and `PARTSEC_ADMIN` role before privileged writes.

At the time of this assessment, multiple functions in `src/app/actions/tenant-actions.ts` perform global tenant/asset/integration writes without an equivalent authorization guard at the beginning of each operation. Some functions in the same file do explicitly check for `PARTSEC_ADMIN`, demonstrating inconsistent enforcement.

### Risk
An authorization control that exists only at routing/UI level is insufficient for privileged Server Actions. These actions should be treated as a priority hardening item.

### Remediation direction
- Centralize reusable authorization helpers.
- Apply them to every privileged Server Action.
- For tenant-user operations, validate both role and tenant ownership server-side.
- Add negative authorization tests.

This documentation change does not alter production behavior; hardening should be performed in a separate reviewed change.

## Tenant isolation
Every tenant-owned query should include tenant context in its predicate whenever practical.

Preferred pattern:
- derive actor and tenant from trusted session/server context;
- query by both resource id and `tenantId`;
- avoid global `findUnique(id)` followed by an application-only ownership assumption.

For composite unique keys, include `tenantId` when supported by the schema.

## Roles
Current roles:
- `PARTSEC_ADMIN`
- `TENANT_ADMIN`
- `TENANT_USER`
- `READ_ONLY`

New functionality must define which roles may read and which may mutate. `READ_ONLY` must never gain mutation capability implicitly.

## Passwords and invitation tokens
- Passwords must be hashed; never persist plaintext passwords.
- Password setup tokens must be random, expire and be single-use.
- Avoid placing reusable secrets in logs.
- Do not expose setup tokens beyond the minimum workflow necessary.

## Integration credentials
Persisted credentials use AES-256-GCM with `INTEGRATION_CREDENTIALS_SECRET`.

Requirements:
- encryption key must remain outside the repository;
- plaintext credentials must never be logged;
- decrypted values should exist only server-side and for the minimum duration necessary;
- credential rotation must be possible without source changes;
- customer-facing responses must never include stored secrets.

## Environment variables
Required server configuration currently includes database, Auth.js, application URL, integration encryption and SMTP settings.

Never commit real values. `.env.example` must contain placeholders only.

## External integrations
For Zabbix, SIEM and support integrations:
- validate configured endpoints;
- use least-privileged external accounts/tokens;
- define reasonable timeouts;
- do not propagate raw upstream errors containing secrets to customers;
- log enough context for troubleshooting without logging credentials.

## Data exposure
Customer-facing product language should avoid unnecessarily exposing internal platform/vendor information. This is both a product abstraction and an information-minimization practice.

## Logging
Logs must not contain:
- passwords;
- password setup tokens;
- API tokens;
- decrypted integration credentials;
- SMTP passwords;
- Auth secrets;
- database credentials.

## Required review for sensitive changes
Changes to these areas require explicit security review before merge:
- authentication/session handling;
- authorization helpers;
- tenant-scoped queries/actions;
- Prisma relationships involving `tenantId`;
- secret encryption/decryption;
- integration credential handling;
- password reset/setup;
- admin role management;
- report/file access involving tenant data.

## Priority hardening backlog
1. Centralize server-side authorization helpers.
2. Apply explicit authorization to all tenant/global Server Actions.
3. Add tests for cross-tenant access denial.
4. Add tests for role mutation restrictions, especially `READ_ONLY`.
5. Add authentication/authorization test coverage.
6. Review token exposure in invitation flows and logs.
7. Document production security headers, TLS/proxy configuration and deployment controls.

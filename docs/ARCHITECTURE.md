# Partsec One Portal — Architecture

## Overview
The Partsec One Portal is a Next.js application backed by PostgreSQL through Prisma. It provides tenant-specific operational views and a global Partsec administration area.

## Current stack
- Next.js 16 / App Router
- React 19
- TypeScript
- Prisma 7
- PostgreSQL
- Auth.js / NextAuth 5 beta with credentials and JWT sessions
- Tailwind CSS 4
- Nodemailer for transactional e-mail

## Main layers
### Presentation
- `src/app/`: App Router routes, portal pages, admin pages, login and password setup.
- `src/components/`: reusable UI and layout components.

### Application
- `src/app/actions/`: Server Actions for authentication, user/admin operations, tenant administration, synchronization and reporting.
- `src/lib/queries/`: database read models and portal/admin queries.

### Domain/data
- `prisma/schema.prisma`: tenant, user, assets, integration configuration, encrypted credentials, monitoring/SIEM snapshots and report runs.
- `src/lib/prisma.ts`: Prisma client setup.

### Integrations
- `src/lib/integrations/zabbix-client.ts`: Zabbix integration.
- `src/lib/integrations/siem-client.ts`: SIEM manager/API integration.
- `src/lib/integrations/siem-indexer-client.ts`: SIEM indexer integration.
- `src/lib/integrations/integration-credentials.ts`: integration credential retrieval.
- `src/lib/sync/`: synchronization workflows.

### Security/supporting services
- `auth.ts`: credentials authentication and JWT/session population.
- `src/proxy.ts`: route-level authentication and `/admin` role gate.
- `src/lib/crypto.ts`: AES-256-GCM encryption for integration credentials.
- `src/lib/password-setup-token.ts`: password setup token lifecycle.
- `src/lib/email/`: transactional e-mail.

## Multi-tenant model
`Tenant` is the primary customer boundary. Tenant-related entities carry `tenantId`, including users, assets, integration configuration, snapshots, synchronization logs and reports.

Roles:
- `PARTSEC_ADMIN`: global Partsec administrator; normally not assigned to a tenant.
- `TENANT_ADMIN`: tenant administrator.
- `TENANT_USER`: standard tenant user.
- `READ_ONLY`: tenant read-only user.

Tenant isolation must be enforced in server-side reads and writes. A route path or tenant slug is not an authorization boundary by itself.

## Current functional areas
The portal route group currently contains:
- Dashboard
- Alerts
- Assets
- Vulnerabilities
- Reports
- Tickets
- Settings
- Global administration

## Integration model
Each tenant may have one configuration per integration type. Current schema types are:
- ZABBIX
- WAZUH (present internally; customer-facing terminology should be SIEM)
- ZAMMAD (present internally; customer-facing terminology should be Central de Suporte/Suporte/Chamados)

Integration credentials are stored separately from integration metadata and encrypted before persistence.

## Snapshot strategy
The portal stores normalized snapshots instead of requiring every customer-facing page to query operational platforms in real time. Existing snapshot models include:
- Zabbix hosts
- Zabbix problems
- SIEM agents
- SIEM vulnerabilities
- Integration synchronization logs

This separation should be preserved: external integrations collect/normalize data, while customer views primarily consume tenant-scoped application data.

## Reporting
`ReportRun` stores generated report metadata and a JSON data snapshot. Report types currently include executive, managerial and technical.

## Architectural principles
1. Tenant isolation before convenience.
2. Server-side authorization at every privileged operation.
3. External systems are integrations, not the application data model.
4. Persist normalized snapshots for stable customer views and reporting.
5. Encrypt integration secrets at rest.
6. Keep customer-facing terminology product-neutral where practical.
7. Prefer explicit, testable server-side boundaries over UI-only restrictions.

## Known architectural debt
- Documentation previously did not describe the actual product architecture.
- Authorization is not yet consistently centralized across all Server Actions.
- Automated tests are not currently defined in `package.json`.
- CI/CD behavior is not documented in this repository.

These items should be addressed incrementally rather than mixed into unrelated feature work.

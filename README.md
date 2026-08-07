# Partsec One Portal

Customer-facing portal for the Partsec One managed-services platform.

The application is multi-tenant and consolidates operational information such as monitored assets, alerts, SIEM vulnerability data, support/ticketing views and generated reports while keeping global administration under Partsec control.

## Stack
- Next.js 16 / App Router
- React 19
- TypeScript
- Prisma 7
- PostgreSQL
- Auth.js / NextAuth 5 beta
- Tailwind CSS 4
- Nodemailer

## Development
1. Install dependencies:
   `npm install`
2. Copy the environment template:
   `cp .env.example .env`
3. Configure PostgreSQL, Auth.js, application URL, integration encryption and SMTP variables.
4. Apply the appropriate Prisma migrations for your environment.
5. Start development:
   `npm run dev`

Available scripts:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

There is currently no repository-defined automated test script; see the assessment and development guide for planned hardening.

## Project documentation
Before making non-trivial changes, read:
- `AGENTS.md`
- `docs/PROJECT_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT.md`

Initial technical assessment:
- `docs/ASSESSMENT-2026-08-07.md`

## Agent collaboration
Claude Code and Codex use the same repository-local architecture and security rules. They must not modify the same branch concurrently. Changes should be made on a dedicated branch and reviewed through a pull request; agents must not merge or deploy production without explicit human approval.

## Product terminology
Customer-facing UI should prefer product-neutral terminology where practical:
- Wazuh -> SIEM
- Zammad -> Central de Suporte / Suporte / Chamados

Technical names may remain in internal/admin implementation where operationally useful.

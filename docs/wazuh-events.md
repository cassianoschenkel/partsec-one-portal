# Wazuh alert events — Phase 1 contract

Phase 1 delivers only a **pure, offline** contract and normalizer
(`src/lib/integrations/siem-events-contract.ts`). There is no live query,
sync, persistence, migration, Server Action, API route or UI yet, and
`siem-indexer-client.ts` is untouched.

> **The normalizer does not authorize display.** A successfully normalized
> event is not visible to any tenant. Every `ok` result carries
> `displayAuthorization: "NOT_AUTHORIZED"`. Tenant isolation is enforced in
> Phase 2 through an allowlist of authorized `agent.id` values; it must never
> be inferred from `agent.name`.

## Alerts vs. archives

- `wazuh-alerts-*` — alerts (detections). In scope.
- `wazuh-archives-*` — raw events. **Out of scope**; the pattern validator
  rejects anything containing `archives`.

## Source document (Indexer hit)

| Output field      | Source                  | Notes                                           |
| ----------------- | ----------------------- | ----------------------------------------------- |
| `indexName`       | `_index`                | with `documentId`, future composite key         |
| `documentId`      | `_id`                   |                                                 |
| `occurredAt`      | `_source.timestamp`, else `_source.@timestamp` | valid `Date` (UTC) |
| `wazuhAgentId`    | `_source.agent.id`      | string, leading zeros preserved (`"001"`)       |
| `agentName`       | `_source.agent.name`    | optional, informational only                    |
| `ruleId`          | `_source.rule.id`       | string                                          |
| `ruleLevel`       | `_source.rule.level`    | native non-negative integer, not mapped to 0–5  |
| `ruleDescription` | `_source.rule.description` |                                              |

`full_log`, `data`, `previous_output`, `rawData` and the whole `_source` are
never copied to the output.

### Timestamp rule

Wazuh usually emits `timestamp` as `2023-07-26T09:21:07.928+0000`; some
documents only have `@timestamp` as `2023-05-09T11:41:31.033Z`.

1. `timestamp` has priority.
2. `@timestamp` is used only if `timestamp` is absent (`undefined`/`null`).
3. If the chosen value is present but invalid (no zone, impossible date,
   non-string), the document is rejected (`INVALID_TIMESTAMP`); there is no
   fallback to the other field and no assumed local time.
4. Accepted zones: `Z`, `±hhmm`, `±hh:mm`, `±hh`; converted to UTC.
   Fractions beyond milliseconds are truncated.

## Result contract

`normalizeSiemAlertHit(hit: unknown)` returns
`{ ok: true, event, displayAuthorization }` or
`{ ok: false, reason, detail }`. Reasons: `NOT_AN_OBJECT`,
`INVALID_INDEX_NAME`, `INVALID_DOCUMENT_ID`, `MISSING_SOURCE`,
`MISSING_AGENT_ID`, `INVALID_AGENT_ID`, `INVALID_AGENT_NAME`,
`MISSING_TIMESTAMP`, `INVALID_TIMESTAMP`, `INVALID_RULE_ID`,
`INVALID_RULE_LEVEL`, `INVALID_RULE_DESCRIPTION`. Events without
`agent.id` are rejected (`MISSING_AGENT_ID`) and are never eligible for a
tenant in the MVP. `detail` never echoes document content.

## Index pattern

`resolveAlertsIndexPattern(configured?)`:

- not configured (`undefined`/`null`) → fallback `wazuh-alerts-*`;
- configured → validated; invalid values (including empty strings) are
  **rejected, not replaced by the fallback**.

The future per-tenant key is `indexer_alerts_index` (like
`indexer_vulnerabilities_index`). Phase 1 does not read credentials.

Accepted: lowercase `[a-z0-9._-]`, starting alphanumeric, `*` at most once
and only as the last character, base ≥ 8 chars, **starting with the exact
prefix `wazuh-alerts-`**, not containing `archives`. Rejected: `*` or broad
prefixes, `/`, `\`, `..`, `?`, `#`, `%`, `:`, `,`, whitespace, URLs,
uppercase, mid-pattern wildcards, and any pattern outside the
`wazuh-alerts-` namespace (e.g. `other-alerts-*`, `acme-wazuh-alerts-*`,
`foo-alerts-bar-*`). Accepted examples: `wazuh-alerts-*`,
`wazuh-alerts-4.x-*`, `wazuh-alerts-4.x-2023.07.26`.

**Why fail-closed:** merely containing `alerts` would let a tenant
configuration point the indexer query at generic or foreign indices
(other products or other customers' prefixes). Requiring the official Wazuh
namespace keeps the query inside the Wazuh alerts indices. Custom index
names are only allowed through a future, explicitly reviewed change.

## Phase 2 proposal (not implemented)

- Query bounded by size and time range, restricted with a `terms` filter on
  `agent.id` for the tenant's authorized agents (empty set ⇒ no query).
- Deterministic pagination with `search_after`. Evaluate a Point-in-Time
  (PIT) for a consistent view, with sort on `timestamp` (desc) plus a
  tiebreaker. Do **not** assume `_id` is sortable by default (it is not
  doc-values-backed; sorting on it may be disabled or costly) — verify
  a suitable tiebreaker (e.g. the PIT implicit `_shard_doc`, or a keyword
  field) against the real cluster.
- Hard caps on pages/total documents per request.

### Needs human verification before live queries

Wazuh Indexer/OpenSearch version, PIT and `search_after` support, mapping of
`timestamp` vs `@timestamp` and `agent.id` (keyword), tiebreaker options, and
index naming/rotation in each environment.

## Phase 2A — persistence schema and reviewed migration (no collector, no UI)

Phase 2A only adds the Prisma model and a versioned SQL file for human
review. There is **no collector, no Indexer query, no sync job and no UI**
yet; nothing writes to or reads from the new table. The migration has not
been applied to any database.

### Table `siem_event_snapshots` (`SiemEventSnapshot`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT` PK | `cuid()` |
| `tenantId` | `TEXT` | FK → `tenants(id)` `ON DELETE CASCADE` |
| `indexName` | `TEXT` | Indexer `_index` |
| `documentId` | `TEXT` | Indexer `_id` |
| `occurredAt` | `TIMESTAMP(3)` | UTC instant validated by the Phase 1 normalizer |
| `wazuhAgentId` | `TEXT` | keeps leading zeros (e.g. `001`) |
| `agentName` | `TEXT?` | |
| `ruleId` | `TEXT` | |
| `ruleLevel` | `INTEGER` | native Wazuh level, not the Zabbix severity scale |
| `ruleDescription` | `TEXT` | |
| `syncedAt` / `createdAt` / `updatedAt` | `TIMESTAMP(3)` | same pattern as other snapshot tables |

Deliberately **not stored**: `rawData`, `full_log`, `data`,
`previous_output`, the full Indexer payload, secrets or credentials. This is
a normalized event snapshot, not a raw archive.

### Unique key and indexes

- `UNIQUE (tenantId, indexName, documentId)` — idempotent ingestion
  (upsert by Indexer hit identity within a tenant).
- Tenant-first composite indexes, all with `occurredAt DESC`:
  `(tenantId, occurredAt)`, `(tenantId, wazuhAgentId, occurredAt)`,
  `(tenantId, ruleLevel, occurredAt)`, `(tenantId, ruleId, occurredAt)`.
- No standalone `tenantId` index (covered by the leftmost prefix of the
  above). **Trade-off:** each extra index slows inserts and grows storage on
  a high-volume table; they were chosen for the expected chronological,
  per-agent, per-level and per-rule filters. Revisit/drop any that Phase 2B/UI
  does not actually use.

### Enum

`IntegrationSyncKind` gains `SIEM_EVENTS` (`ALTER TYPE ... ADD VALUE`). It is
**not** connected to the Integration Health policy; the existing Wazuh health
(agents + vulnerabilities) is unchanged. Wiring it is pending Phase 2B.

### Migration

`prisma/migrations/20261022140000_add_siem_event_snapshots/migration.sql` —
additive only (enum value, `CREATE TABLE`, indexes, FK). No `DROP`,
`DELETE`, `TRUNCATE`, backfill, inserts, or changes to existing tables
(other than the enum). It was written to match what Prisma generates for the
schema (63-char identifier truncation considered) but was **not** generated
or checked against a database.

### Human validation plan (before production)

1. Take a backup of the target database.
2. In staging (copy of production schema), diff the SQL against
   `prisma migrate diff` output for the schema and fix any divergence.
3. Apply in staging (human only), check `\d siem_event_snapshots`, index
   names, FK and the enum value; confirm the table is empty and existing
   features (agents, vulnerabilities, Integration Health) still work.
4. Only after approval, apply in production via the normal deploy process.

### Proposals for Phase 2B (not implemented, pending operational approval)

- Initial retention of **30 days** (no deletion job exists or is added here).
- Candidate sync frequency: **every 15 minutes**.
- Hard limits for the collector: time window, page size, max pages and max
  documents per run per tenant.
- Tenant authorization: `tenantId` on the table does not authorize
  ingestion or reading. The collector must confront agent IDs with a
  trusted link to each tenant's Wazuh group (`externalGroupId`); do not rely
  on possibly stale snapshots and never fall back to "all agents" when
  `externalGroupId` is missing.

### Identity collision risk

Identity is `(tenantId, indexName, documentId)`. If the Indexer
endpoint/cluster is replaced or re-indexed without planning, the same
`_index`/`_id` may refer to different events (or the same event may appear
under new names), causing overwritten rows or duplicates. Any endpoint change
needs a migration plan (e.g. purge/re-sync for the tenant) first.

## References

- https://documentation.wazuh.com/current/user-manual/wazuh-indexer/wazuh-indexer-indices.html
- https://documentation.wazuh.com/current/user-manual/capabilities/command-monitoring/command-output-analysis.html
- https://documentation.wazuh.com/current/user-manual/capabilities/container-security/use-cases.html

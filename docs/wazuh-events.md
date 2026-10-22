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
and only as the last character, base ≥ 8 chars, containing `alerts`, not
containing `archives`. Rejected: `*` or broad prefixes, `/`, `\`, `..`,
`?`, `#`, `%`, `:`, `,`, whitespace, URLs, uppercase, mid-pattern wildcards.

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

## References

- https://documentation.wazuh.com/current/user-manual/wazuh-indexer/wazuh-indexer-indices.html
- https://documentation.wazuh.com/current/user-manual/capabilities/command-monitoring/command-output-analysis.html
- https://documentation.wazuh.com/current/user-manual/capabilities/container-security/use-cases.html

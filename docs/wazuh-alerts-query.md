# Wazuh alerts: bounded query and tenant authorization (Phase 2B-1)

Offline-only query + authorization layer. No persistence, sync log,
checkpoint, scheduler, migration, UI or Server Action exists yet (Phase 2B-2).
Nothing here has been run against a real Manager or Indexer.

Modules (`src/lib/integrations/`):

- `siem-alerts-authorization.ts` — pure fail-closed agent allowlist.
- `siem-alerts-query.ts` — query builder + collector with injected `fetch`.
- Reuses `normalizeSiemAlertHit`, `resolveAlertsIndexPattern` and
  `DEFAULT_ALERTS_INDEX_PATTERN` from `siem-events-contract.ts`.

## Authorization (fail closed)

`resolveAuthorizedAlertAgents` returns an allowlist only when ALL hold:
tenant active; integration is `WAZUH` and `ACTIVE`; tenant ids match the
acting session tenant; `externalGroupId` set, well-formed, not `default`/`all`
and not used by another integration; Manager and Indexer report the same
non-empty origin id; the Manager confirmed the group, returned at least one
agent (max 1000), each id is a zero-padded numeric string other than `000`,
and each agent attests membership in the group and in no other tenant's group.
Anything else denies, and the collector throws before any request.
`SiemClient.getAgents(group?)` (no group => all agents) is NOT used or changed.

## Query rules

- `_source` limited to `timestamp`, `@timestamp`, `agent.id`, `agent.name`,
  `rule.id`, `rule.level`, `rule.description`.
- Always a UTC range on `@timestamp` (`gte`/`lt`) plus `terms` on `agent.id`.
- Every hit is re-normalized and re-checked locally: agent in allowlist (exact
  string, leading zeros significant), index matches the validated pattern,
  timestamp inside the window. The normalizer's `NOT_AUTHORIZED` marker is
  replaced only after those checks.
- Limits are rejected (not clamped) outside hard maximums:

  | Limit | Default | Hard max |
  | --- | --- | --- |
  | pageSize | 200 | 500 |
  | maxPages | 5 | 20 |
  | maxDocuments | 1000 | 10000 |
  | window | caller-chosen | 7 days |
  | timeoutMs | 15000 | 60000 |

- `INCOMPLETE` (never advance a checkpoint): `LIMIT_REACHED`,
  `TIEBREAKER_NOT_VERIFIED`, `SORT_MISSING_OR_AMBIGUOUS`, `REPEATED_CURSOR`.
- TLS is untouched; errors never include underlying messages or credentials.

## Open items requiring human verification (staging)

1. **Origin proof is not available from current contracts.** Manager base URL
   (`baseUrl`) and Indexer URL (`externalOrgId`, a temporary overload) are
   unrelated fields, so nothing today proves they belong to one cluster. A
   factory must obtain a trustworthy cluster/origin id from both sides before
   wiring this; until then collection must stay disabled. No factory was added.
2. **Group membership**: confirm the Manager `/agents?group=` response exposes
   a `group` array per agent and the group-exists check endpoint to use.
3. **Mapping** of `agent.id` (keyword?), `timestamp` vs `@timestamp`, and
   whether `@timestamp` is a `date` field.
4. **Tiebreaker / PIT**: multi-page collection (`search_after`) is
   **unavailable** until a human verifies, in a real staging Wazuh Indexer, a
   field that exists, is sortable and is unique per alert document.
   - `VERIFIED_ALERT_TIEBREAKER_FIELDS` ships **empty**. A caller-supplied
     `tiebreakerField` is only honored if it is in that list (or in an
     explicitly injected `verifiedTiebreakerFields`, intended for tests);
     otherwise a full page yields `INCOMPLETE` / `TIEBREAKER_NOT_VERIFIED`.
   - Syntax is validated before any query is built: a single flat identifier
     (`/^[A-Za-z][A-Za-z0-9_]{0,63}$/`). `agent.id` (shared by many events),
     `_id`, `timestamp`, `@timestamp`, empty values, dotted paths, wildcards,
     commas, spaces and other characters are rejected with
     `INVALID_TIEBREAKER`. Passing syntax validation is NOT proof of uniqueness.
   - Tests use the **synthetic, hypothetical** name
     `synthetic_unique_seq_test_only`. It is NOT a real Wazuh field; its
     existence/compatibility in Wazuh was **not verified** and it must never be
     used outside tests.
   - Ties straddling a page boundary cannot be detected client-side. PIT is
     not implemented and no real pagination capability is claimed; PIT plus a
     verified unique tiebreaker must be validated in staging.
5. Per-tenant `indexer_alerts_index` must come from the encrypted
   `IntegrationCredential` in a future tenant-scoped factory (not added here).

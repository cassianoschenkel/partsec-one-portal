import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { toCustomerIntegrationView } from "./customer-settings-view";
import { customerSettingsSelect } from "./queries/customer-settings";

const FORBIDDEN = [
  "baseUrl",
  "externalGroupId",
  "externalOrgId",
  "notes",
  "credentials",
  "slug",
  "assets",
];

test("customer settings select is a strict allowlist", () => {
  const serialized = JSON.stringify(customerSettingsSelect);
  for (const key of FORBIDDEN) {
    assert.equal(serialized.includes(`"${key}"`), false, `leaks ${key}`);
  }
  assert.deepEqual(
    Object.keys(customerSettingsSelect.integrations.select).sort(),
    ["status", "type"]
  );
});

test("integration view exposes only neutral labels", () => {
  for (const type of ["ZABBIX", "WAZUH", "ZAMMAD"] as const) {
    for (const status of ["ACTIVE", "INACTIVE", "ERROR"] as const) {
      const view = toCustomerIntegrationView({ type, status });
      assert.deepEqual(Object.keys(view).sort(), [
        "description",
        "key",
        "label",
        "statusLabel",
      ]);
      assert.equal("id" in view, false);
      assert.doesNotMatch(
        JSON.stringify({ ...view, key: undefined }),
        /ACTIVE|INACTIVE|ERROR|https?:|:55000/
      );
    }
  }
  assert.equal(
    toCustomerIntegrationView({ type: "WAZUH", status: "ACTIVE" }).label,
    "Segurança"
  );
  assert.equal(
    toCustomerIntegrationView({ type: "WAZUH", status: "ERROR" }).statusLabel,
    "Indisponível"
  );
});

test("customer card key is the integration type", () => {
  assert.equal(
    toCustomerIntegrationView({ type: "ZABBIX", status: "ACTIVE" }).key,
    "ZABBIX"
  );
});

// Static/structural guard only (not an E2E/HTML/RSC test): the client branch
// of the portal layout must not pass session name/email to PortalLayout.
test("portal layout passes userName/userEmail only in PARTSEC_ADMIN branch", () => {
  const src = readFileSync("src/app/(portal)/layout.tsx", "utf8");
  const elements = src.match(/<PortalLayout[\s\S]*?>/g) ?? [];
  assert.equal(elements.length, 2);
  const [admin, client] = elements;
  assert.match(admin, /userName=/);
  assert.match(admin, /userEmail=/);
  assert.doesNotMatch(client, /userName|userEmail/);
  assert.match(client, /userRole=\{session\.user\.role\}/);
});

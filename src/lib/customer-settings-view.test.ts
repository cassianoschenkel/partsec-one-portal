import { test } from "node:test";
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
    ["id", "status", "type"]
  );
});

test("integration view exposes only neutral labels", () => {
  for (const type of ["ZABBIX", "WAZUH", "ZAMMAD"] as const) {
    for (const status of ["ACTIVE", "INACTIVE", "ERROR"] as const) {
      const view = toCustomerIntegrationView({ id: "i1", type, status });
      assert.deepEqual(Object.keys(view).sort(), [
        "description",
        "id",
        "label",
        "statusLabel",
      ]);
      assert.doesNotMatch(
        JSON.stringify(view),
        /ACTIVE|INACTIVE|ERROR|https?:|:55000/
      );
    }
  }
  assert.equal(
    toCustomerIntegrationView({ id: "a", type: "WAZUH", status: "ACTIVE" })
      .label,
    "Segurança"
  );
  assert.equal(
    toCustomerIntegrationView({ id: "a", type: "WAZUH", status: "ERROR" })
      .statusLabel,
    "Indisponível"
  );
});

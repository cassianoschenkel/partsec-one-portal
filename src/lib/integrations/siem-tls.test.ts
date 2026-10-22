import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";

// The clients import the Prisma singleton, which needs a connection string at
// import time. PrismaPg connects lazily, so a dummy value keeps this offline.
process.env.DATABASE_URL ??= "postgresql://dummy:dummy@localhost:5432/dummy";

const TLS_VAR = "NODE_TLS_REJECT_UNAUTHORIZED";

let SiemClient: typeof import("./siem-client").SiemClient;
let SiemIndexerClient: typeof import("./siem-indexer-client").SiemIndexerClient;

before(async () => {
  ({ SiemClient } = await import("./siem-client"));
  ({ SiemIndexerClient } = await import("./siem-indexer-client"));
});

function instantiate() {
  new SiemClient({
    baseUrl: "https://manager.example.invalid:55000/",
    username: "dummy",
    password: "dummy",
  });
  new SiemIndexerClient({
    baseUrl: "https://indexer.example.invalid:9200/",
    username: "dummy",
    password: "dummy",
    vulnerabilitiesIndex: "wazuh-states-vulnerabilities*",
  });
}

describe("Wazuh clients TLS verification", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[TLS_VAR];
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env[TLS_VAR];
    } else {
      process.env[TLS_VAR] = original;
    }
  });

  it("does not set NODE_TLS_REJECT_UNAUTHORIZED when it is unset", () => {
    delete process.env[TLS_VAR];
    instantiate();
    assert.equal(process.env[TLS_VAR], undefined);
  });

  it("does not modify NODE_TLS_REJECT_UNAUTHORIZED when already set", () => {
    process.env[TLS_VAR] = "1";
    instantiate();
    assert.equal(process.env[TLS_VAR], "1");
  });

  it("client sources contain no TLS verification bypass", () => {
    for (const file of ["siem-client.ts", "siem-indexer-client.ts"]) {
      const source = readFileSync(join(__dirname, file), "utf8");
      assert.doesNotMatch(source, /NODE_TLS_REJECT_UNAUTHORIZED/, file);
      assert.doesNotMatch(source, /rejectUnauthorized/, file);
      assert.doesNotMatch(source, /checkServerIdentity/, file);
      assert.doesNotMatch(source, /\bdispatcher\b/, file);
    }
  });
});

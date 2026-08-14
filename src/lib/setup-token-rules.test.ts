import { test } from "node:test";
import assert from "node:assert/strict";
import { isSetupTokenUsable } from "./setup-token-rules";

const now = new Date("2026-01-01T00:00:00.000Z");

test("isSetupTokenUsable rejects a missing token", () => {
  assert.equal(isSetupTokenUsable(null, now), false);
});

test("isSetupTokenUsable rejects an already used token", () => {
  const token = {
    usedAt: new Date("2025-12-31T00:00:00.000Z"),
    expiresAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  assert.equal(isSetupTokenUsable(token, now), false);
});

test("isSetupTokenUsable rejects an expired token", () => {
  const token = {
    usedAt: null,
    expiresAt: new Date("2025-12-31T00:00:00.000Z"),
  };

  assert.equal(isSetupTokenUsable(token, now), false);
});

test("isSetupTokenUsable rejects a token expiring exactly now", () => {
  const token = {
    usedAt: null,
    expiresAt: now,
  };

  assert.equal(isSetupTokenUsable(token, now), false);
});

test("isSetupTokenUsable accepts a valid, unused, unexpired token", () => {
  const token = {
    usedAt: null,
    expiresAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  assert.equal(isSetupTokenUsable(token, now), true);
});

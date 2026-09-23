#!/usr/bin/env node
"use strict";

/**
 * Validation script for block-dangerous-bash.js.
 *
 * Calls evaluateCommand() directly with synthetic command strings —
 * it never invokes any of the real dangerous commands. Run with:
 *   node .claude/hooks/validate-block-dangerous-bash.js
 */

const { evaluateCommand } = require("./block-dangerous-bash.js");

const cases = [
  // [command, expectBlocked]
  ["npm ci", false],
  ["npm test", false],
  ["npm run lint", false],
  ["npm run build", false],
  ["npx prisma generate", false],
  ["npx prisma validate", false],
  ["git status", false],
  ["git diff --stat", false],
  ["cat scripts/deploy.sh", false],
  ["cat scripts/backup-db.sh", false],
  ["grep -n DATABASE_URL scripts/backup-db.sh", false],
  ["cat scripts/sync-zabbix.ts", false],
  ["less scripts/set-user-password.ts", false],
  ["git push origin chore/development-automation-foundation", false],
  ["git clean -n", false],

  ["sudo apt-get update", true],
  ["sudo -n whoami", true],
  ["npx prisma migrate deploy", true],
  ["prisma migrate deploy --schema=prisma/schema.prisma", true],
  ["npx prisma db push", true],
  ["prisma db push", true],
  ["scripts/deploy.sh", true],
  ["./scripts/deploy.sh", true],
  ["bash scripts/deploy.sh", true],
  ["sh ./scripts/deploy.sh", true],
  ["scripts/backup-db.sh", true],
  ["bash scripts/backup-db.sh", true],
  ["git push --force", true],
  ["git push origin main --force", true],
  ["git push -f origin main", true],
  ["git push --force-with-lease", true],
  ["git reset --hard HEAD~1", true],
  ["git clean -f", true],
  ["git clean -fd", true],
  ["git clean -fdx", true],
  ["git clean -df", true],
  ["psql postgresql://localhost/db", true],
  ["pg_dump postgresql://localhost/db", true],
  ["pg_restore backup.dump", true],
  ["npx tsx scripts/set-initial-passwords.ts", true],
  ["npx tsx scripts/set-user-password.ts a@b.com secret", true],
  ["npx tsx scripts/set-siem-credentials.ts", true],
  ["npx tsx scripts/bootstrap-admin.ts a@b.com secret", true],
  ["npx tsx scripts/sync-zabbix.ts", true],
  ["npx tsx scripts/sync-siem-agents.ts", true],
  ["npx tsx scripts/sync-siem-vulnerabilities.ts", true],
  ["npx tsx scripts/import-zabbix-assets.ts", true],
  ["npx tsx scripts/debug-zabbix-problem-hosts.ts acme", true],
  ["npm run build && sudo reboot", true],
  ["echo ok; git push --force", true],

  // Wrapper / path / global-option bypasses.
  ["/usr/bin/sudo whoami", true],
  ["env sudo whoami", true],
  ["command sudo whoami", true],
  ["bash -c 'scripts/deploy.sh'", true],
  ["sh -c 'npx prisma migrate deploy'", true],
  ["zsh -c 'npx prisma db push'", true],
  ["env bash scripts/deploy.sh", true],
  ["git -c core.hooksPath=/tmp push --force origin main", true],
  ["git -c color.ui=false reset --hard HEAD~1", true],
  ["git -c color.ui=false clean -fd", true],
  ["command psql postgresql://localhost/db", true],
  ["env pg_dump postgresql://localhost/db", true],
  ["/usr/bin/pg_restore backup.dump", true],

  // Shell options that consume the following token as their argument.
  ["bash -O extglob scripts/deploy.sh", true],
  ["bash -o posix scripts/deploy.sh", true],
  ["bash --rcfile algum-arquivo scripts/deploy.sh", true],
  ["bash --init-file algum-arquivo scripts/deploy.sh", true],
  ["bash +O extglob scripts/backup-db.sh", true],
  ["sh -o errexit scripts/deploy.sh", true],
  ["zsh -o shwordsplit scripts/backup-db.sh", true],
  ["dash +o noglob scripts/deploy.sh", true],
  ["bash -x -- scripts/deploy.sh", true],

  // Sensitive TS scripts via npm exec / npm x.
  ["npm exec tsx -- scripts/sync-zabbix.ts", true],
  ["npm exec -- tsx scripts/sync-siem-agents.ts", true],
  ["npm exec tsx -- scripts/set-user-password.ts user@example.com dummy", true],
  ["npm x tsx -- scripts/set-siem-credentials.ts", true],
  ["npm exec --yes tsx -- ./scripts/bootstrap-admin.ts", true],

  // Safe commands that must stay allowed through the same code paths.
  ["git -c color.ui=false status", false],
  ["bash -c 'echo ok'", false],
  ["bash -c 'cat scripts/deploy.sh'", false],
  ["bash -O extglob -c 'echo ok'", false],
  ["env npm test", false],
  ["cat scripts/deploy.sh", false],
  ["npm exec tsx -- scripts/check-env.ts", false],
];

let failures = 0;

for (const [command, expectBlocked] of cases) {
  const reason = evaluateCommand(command);
  const wasBlocked = reason !== null;

  if (wasBlocked !== expectBlocked) {
    failures++;
    console.error(
      `FAIL: "${command}" -> blocked=${wasBlocked} (expected ${expectBlocked})${
        reason ? ` reason="${reason}"` : ""
      }`
    );
  } else {
    console.log(
      `ok:   "${command}" -> ${wasBlocked ? `BLOCKED (${reason})` : "allowed"}`
    );
  }
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);

if (failures > 0) {
  process.exit(1);
}

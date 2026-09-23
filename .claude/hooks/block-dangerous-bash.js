#!/usr/bin/env node
"use strict";

/**
 * PreToolUse hook for the Bash tool.
 *
 * Defense in depth for .claude/settings.json: blocks a fixed set of
 * destructive/production-affecting command patterns even if a stale
 * local `allow` rule (e.g. an old .claude/settings.local.json) would
 * otherwise let them through.
 *
 * Reads the Claude Code hook payload from stdin ({ tool_name, tool_input }),
 * and if tool_name is "Bash", inspects tool_input.command. Uses only
 * Node.js standard library — no npm dependency.
 *
 * Executables are compared by basename (/usr/bin/sudo -> sudo), simple
 * wrappers (env, command, exec, nohup, VAR=value) are peeled off,
 * `bash|sh|zsh -c '...'` strings are evaluated recursively, and git global
 * options (-c, -C, --git-dir, ...) are skipped before reading the
 * subcommand. This is pattern matching, not a shell parser; the command
 * under analysis is never executed.
 */

const path = require("path");

const READER_COMMANDS = new Set([
  "cat",
  "less",
  "more",
  "head",
  "tail",
  "grep",
  "egrep",
  "fgrep",
  "rg",
  "awk",
  "sed",
  "strings",
  "file",
  "wc",
  "diff",
  "nl",
  "view",
  "bat",
  "ls",
  "stat",
  "md5sum",
  "sha256sum",
  "vim",
  "nvim",
  "nano",
  "code",
  "find",
  "xxd",
  "od",
]);

const RUNNER_COMMANDS = new Set(["npx", "tsx", "node", "bash", "sh", "zsh", "dash", "source"]);

const SHELL_COMMANDS = new Set(["bash", "sh", "zsh", "dash"]);

// Max nesting of `bash -c '...'` / wrappers we are willing to unwrap.
// Anything deeper is denied rather than silently allowed.
const MAX_DEPTH = 5;

// VAR=value prefix (e.g. "FOO=1 sudo whoami" or "env FOO=1 sudo whoami").
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

// `env` options that consume the following token as their argument.
const ENV_OPTIONS_WITH_ARG = new Set(["-u", "--unset", "-C", "--chdir"]);

// Shell options that consume the following token as their argument.
const SHELL_OPTIONS_WITH_ARG = new Set(["-o", "+o", "-O", "+O", "--rcfile", "--init-file"]);

// git global options (before the subcommand) that consume the following
// token as their argument, e.g. `git -c core.hooksPath=/tmp push`.
const GIT_GLOBAL_OPTIONS_WITH_ARG = new Set([
  "-c",
  "-C",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--config-env",
  "--exec-path",
  "--list-cmds",
]);

const SENSITIVE_SHELL_SCRIPTS = ["scripts/deploy.sh", "scripts/backup-db.sh"];

const SENSITIVE_TS_SCRIPTS = [
  "scripts/set-initial-passwords.ts",
  "scripts/set-user-password.ts",
  "scripts/set-siem-credentials.ts",
  "scripts/bootstrap-admin.ts",
  "scripts/sync-zabbix.ts",
  "scripts/sync-siem-agents.ts",
  "scripts/sync-siem-vulnerabilities.ts",
  "scripts/import-zabbix-assets.ts",
  "scripts/debug-zabbix-problem-hosts.ts",
];

function basename(p) {
  return path.basename(p.replace(/^\.\//, ""));
}

function pathMatches(token, target) {
  const cleanToken = token.replace(/^\.\//, "");
  return (
    cleanToken === target ||
    cleanToken.endsWith("/" + target) ||
    basename(cleanToken) === basename(target)
  );
}

// Naive shell tokenizer: splits on whitespace, respecting simple
// single/double quoting. Good enough for pattern matching in a
// defense-in-depth hook — it does not need to be a full shell parser.
function tokenize(command) {
  const tokens = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

// Splits a full command line into subcommands on shell control
// operators (;, &&, ||, |, newline) so each piece can be evaluated
// independently (e.g. "cat scripts/deploy.sh && sudo rm -rf /").
function splitSubcommands(command) {
  return command
    .split(/(?:;|&&|\|\||\||\n)/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// `env [-i] [-u NAME] [NAME=value]... cmd args` -> `cmd args`.
// `env -S "cmd args"` splits the string into tokens, like env itself does.
function stripEnv(tokens) {
  let i = 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "-S" || t === "--split-string") {
      return [...tokenize(tokens[i + 1] || ""), ...tokens.slice(i + 2)];
    }
    if (t.startsWith("--split-string=")) {
      return [...tokenize(t.slice("--split-string=".length)), ...tokens.slice(i + 1)];
    }
    if (/^-S./.test(t)) {
      return [...tokenize(t.slice(2)), ...tokens.slice(i + 1)];
    }
    if (t === "--") {
      return tokens.slice(i + 1);
    }
    if (ENV_OPTIONS_WITH_ARG.has(t)) {
      i += 2;
      continue;
    }
    if (t.startsWith("-") || ASSIGNMENT.test(t)) {
      i++;
      continue;
    }
    break;
  }
  return tokens.slice(i);
}

// `command [-p] cmd args` -> `cmd args`. `command -v/-V` only looks the
// name up and never executes it, so it yields nothing to inspect.
function stripCommandBuiltin(tokens) {
  let i = 1;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    if (tokens[i] === "--") {
      i++;
      break;
    }
    if (/[vV]/.test(tokens[i])) {
      return [];
    }
    i++;
  }
  return tokens.slice(i);
}

// `exec [-cl] [-a name] cmd args` -> `cmd args`.
function stripExec(tokens) {
  let i = 1;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    if (tokens[i] === "--") {
      i++;
      break;
    }
    i += tokens[i] === "-a" ? 2 : 1;
  }
  return tokens.slice(i);
}

// Peels off leading VAR=value assignments and simple exec wrappers
// (env, command, exec, nohup) until the real executable is at tokens[0].
function unwrapCommand(tokens) {
  let current = tokens;
  for (let guard = 0; guard < 16; guard++) {
    let i = 0;
    while (i < current.length && ASSIGNMENT.test(current[i])) {
      i++;
    }
    current = current.slice(i);
    if (current.length === 0) {
      return current;
    }

    const exe = basename(current[0]);
    if (exe === "env") {
      current = stripEnv(current);
    } else if (exe === "command") {
      current = stripCommandBuiltin(current);
    } else if (exe === "exec") {
      current = stripExec(current);
    } else if (exe === "nohup") {
      current = current.slice(1);
    } else {
      return current;
    }
  }
  return current;
}

// For `bash|sh|zsh|dash [opts] -c 'string'`, returns the string passed to
// -c (including clustered forms like -lc / -ec); otherwise null.
function extractShellCommandString(tokens) {
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "--" || !(t.startsWith("-") || t.startsWith("+"))) {
      return null;
    }
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(t)) {
      return tokens[i + 1] || "";
    }
    if (SHELL_OPTIONS_WITH_ARG.has(t)) {
      i++;
    }
  }
  return null;
}

// `git [global options] <subcommand> args` -> `git <subcommand> args`.
function normalizeGit(tokens) {
  let i = 1;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    if (tokens[i] === "--") {
      i++;
      break;
    }
    i += GIT_GLOBAL_OPTIONS_WITH_ARG.has(tokens[i]) ? 2 : 1;
  }
  return ["git", ...tokens.slice(i)];
}

function isSudo(exe) {
  return exe === "sudo";
}

// Matches a sequence of consecutive tokens anywhere in the token list,
// e.g. hasTokenSequence(["npx","prisma","migrate","deploy"], ["migrate","deploy"]).
function hasTokenSequence(tokens, sequence) {
  for (let i = 0; i <= tokens.length - sequence.length; i++) {
    if (sequence.every((word, j) => tokens[i + j] === word)) {
      return true;
    }
  }
  return false;
}

function isPrismaMigrateDeploy(tokens) {
  return tokens.includes("prisma") && hasTokenSequence(tokens, ["migrate", "deploy"]);
}

function isPrismaDbPush(tokens) {
  return tokens.includes("prisma") && hasTokenSequence(tokens, ["db", "push"]);
}

function isShellScriptExecution(tokens, scriptPath) {
  if (tokens.length === 0) {
    return false;
  }

  if (pathMatches(tokens[0], scriptPath)) {
    return true;
  }

  const exe = basename(tokens[0]);

  if ((exe === "source" || exe === ".") && tokens[1] && pathMatches(tokens[1], scriptPath)) {
    return true;
  }

  if (SHELL_COMMANDS.has(exe)) {
    const script = findShellScriptOperand(tokens);
    return Boolean(script) && pathMatches(script, scriptPath);
  }

  return false;
}

// For `bash|sh|zsh|dash [opts] script args`, returns the first positional
// argument (the script), skipping options and the argument consumed by
// options in SHELL_OPTIONS_WITH_ARG (e.g. `bash -O extglob script.sh`).
function findShellScriptOperand(tokens) {
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "--") {
      return tokens[i + 1] || null;
    }
    if (SHELL_OPTIONS_WITH_ARG.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith("-") || t.startsWith("+")) {
      continue;
    }
    return t;
  }
  return null;
}

// `npm exec [opts] [--] <pkg> args` / `npm x ...` run arbitrary binaries
// (e.g. `npm exec tsx -- scripts/sync-zabbix.ts`), so any token after the
// subcommand that names the script counts as executing it.
function isNpmExec(tokens) {
  return basename(tokens[0]) === "npm" && (tokens[1] === "exec" || tokens[1] === "x");
}

function isTsScriptExecution(tokens, scriptPath) {
  if (tokens.length === 0) {
    return false;
  }

  if (pathMatches(tokens[0], scriptPath)) {
    return true;
  }

  if (RUNNER_COMMANDS.has(basename(tokens[0]))) {
    return tokens.slice(1).some((t) => pathMatches(t, scriptPath));
  }

  if (isNpmExec(tokens)) {
    return tokens.slice(2).some((t) => pathMatches(t, scriptPath));
  }

  return false;
}

function isGitPushForce(tokens) {
  if (tokens[0] !== "git" || tokens[1] !== "push") {
    return false;
  }

  return tokens.slice(2).some(
    (t) => t === "--force" || t === "-f" || t === "--force-with-lease" || t.startsWith("--force-with-lease=")
  );
}

function isGitResetHard(tokens) {
  return tokens[0] === "git" && tokens[1] === "reset" && tokens.includes("--hard");
}

function isGitCleanForce(tokens) {
  if (tokens[0] !== "git" || tokens[1] !== "clean") {
    return false;
  }

  return tokens.slice(2).some((t) => {
    if (t === "--force") {
      return true;
    }
    // short flag clusters like -f, -fd, -fdx, -df, -dfx, -xdf...
    return /^-[a-z]*f[a-z]*$/.test(t);
  });
}

function isDbCliInvocation(tokens) {
  if (tokens.length === 0) {
    return false;
  }

  const exe = basename(tokens[0]);
  return exe === "psql" || exe === "pg_dump" || exe === "pg_restore";
}

function evaluateSubcommand(subcommand, depth) {
  let tokens = unwrapCommand(tokenize(subcommand));

  if (tokens.length === 0) {
    return null;
  }

  const exe = basename(tokens[0]);

  // `bash -c '...'` and friends: evaluate the inner command string with
  // the same rules. The outer tokens are not re-checked, so reading a
  // script via `bash -c 'cat scripts/deploy.sh'` stays allowed.
  if (SHELL_COMMANDS.has(exe)) {
    const inner = extractShellCommandString(tokens);
    if (inner !== null) {
      return evaluateCommand(inner, depth + 1);
    }
  }

  if (exe === "git") {
    tokens = normalizeGit(tokens);
  }

  if (isSudo(exe)) {
    return "sudo é proibido nesta sessão (production/system safety).";
  }

  if (isPrismaMigrateDeploy(tokens)) {
    return "`prisma migrate deploy` é proibido nesta sessão. Migrations de produção são um passo manual e humano.";
  }

  if (isPrismaDbPush(tokens)) {
    return "`prisma db push` é proibido nesta sessão (pode divergir/destruir o schema real).";
  }

  for (const script of SENSITIVE_SHELL_SCRIPTS) {
    if (isShellScriptExecution(tokens, script)) {
      return `Execução de ${script} é proibida nesta sessão (operação de produção/manual).`;
    }
  }

  for (const script of SENSITIVE_TS_SCRIPTS) {
    if (isTsScriptExecution(tokens, script)) {
      return `Execução de ${script} é proibida nesta sessão (credenciais, senha, e-mail real ou sincronização contra integração externa real).`;
    }
  }

  if (isGitPushForce(tokens)) {
    return "`git push --force`/`--force-with-lease` é proibido nesta sessão.";
  }

  if (isGitResetHard(tokens)) {
    return "`git reset --hard` é proibido nesta sessão (pode descartar trabalho não commitado).";
  }

  if (isGitCleanForce(tokens)) {
    return "`git clean -f/-fd/-fdx` é proibido nesta sessão (remove arquivos não versionados sem confirmação).";
  }

  if (isDbCliInvocation(tokens)) {
    return `\`${basename(tokens[0])}\` é proibido nesta sessão (acesso direto a banco de dados real).`;
  }

  return null;
}

function evaluateCommand(command, depth = 0) {
  if (depth > MAX_DEPTH) {
    return "Comando com aninhamento de shell/wrappers excessivo; negado por segurança.";
  }

  for (const subcommand of splitSubcommands(command)) {
    const reason = evaluateSubcommand(subcommand, depth);
    if (reason) {
      return reason;
    }
  }
  return null;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await readStdin();

  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    // Malformed input: fail open rather than blocking unrelated tool calls.
    process.stdout.write(JSON.stringify({}));
    return;
  }

  if (payload.tool_name !== "Bash") {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const command = payload.tool_input && payload.tool_input.command;

  if (typeof command !== "string" || command.trim() === "") {
    process.stdout.write(JSON.stringify({}));
    return;
  }

  const reason = evaluateCommand(command);

  if (reason) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({}));
}

if (require.main === module) {
  main().catch((error) => {
    // Fail open on unexpected hook errors so a bug here cannot silently
    // block all Bash usage; the permission rules in settings.json remain
    // the primary control.
    process.stderr.write(`block-dangerous-bash hook error: ${error && error.stack}\n`);
    process.stdout.write(JSON.stringify({}));
  });
}

module.exports = {
  evaluateCommand,
  tokenize,
  splitSubcommands,
};

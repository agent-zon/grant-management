#!/usr/bin/env node
/**
 * Runs persist-mcp-ams-eval.mjs three times so GitHub eval artifacts land under different variant paths:
 *  1. privileged-mode — PERSIST_EVAL_ENV grant.privileged_mode true (full DCN + eval writes)
 *  2. obo-actas — minimal env; OBO policies get $env.actas.on_behalf_of_user from Go (skip DCN)
 *  3. work-hours — inject time.hour + work.inside_business_hours (skip DCN)
 *
 * Forward args after -- to the persist script, e.g.:
 *   node scripts/persist-mcp-ams-eval-variants.mjs -- --agent agent-123 --ref main
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const persist = join(root, "scripts", "persist-mcp-ams-eval.mjs");

const dash = process.argv.indexOf("--");
const forwarded = dash === -1 ? [] : process.argv.slice(dash + 1);

function run(label, extraEnv) {
  const env = { ...process.env, ...extraEnv, USE_GO_EVAL: "1" };
  console.log(`\n[persist-mcp-ams-eval-variants] === ${label} ===\n`);
  const r = spawnSync(process.execPath, [persist, ...forwarded], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`[persist-mcp-ams-eval-variants] ${label} failed with exit ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

run("privileged-mode (full DCN + eval)", {
  PERSIST_EVAL_VARIANT: "privileged-mode",
  PERSIST_EVAL_ENV: JSON.stringify({ grant: { privileged_mode: true } }),
});

run("obo-actas (eval only, OBO env from policy name)", {
  PERSIST_SKIP_DCN: "1",
  PERSIST_EVAL_VARIANT: "obo-actas",
  PERSIST_EVAL_ENV: "{}",
});

run("work-hours (eval only, injected clock / business hours)", {
  PERSIST_SKIP_DCN: "1",
  PERSIST_EVAL_VARIANT: "work-hours",
  PERSIST_EVAL_ENV: JSON.stringify({
    time: { hour: 14, minute: 0 },
    work: { inside_business_hours: true },
  }),
});

console.log("\n[persist-mcp-ams-eval-variants] all three variants completed\n");

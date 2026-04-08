#!/usr/bin/env node
/**
 * Runs persist-mcp-ams-eval.mjs three times with different PERSIST_EVAL_ENV (merged eval per policy).
 * Writes `{agent}/eval/{policySlug}.json` each time — last successful run wins on that branch.
 *  1. privileged-mode — grant.privileged_mode true (full DCN + eval)
 *  2. obo-actas — OBO policies get actas in Go (skip DCN)
 *  3. work-hours — time / business hours (skip DCN)
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

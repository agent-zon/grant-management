/**
 * Version helpers — version = short hash of branch for URL paths.
 * Branch = Git ref (main or draft-{agent}-{sub}-{sid}).
 * Version = "main" or 12-char hex hash for draft branches.
 */

import cds from "@sap/cds";
import { createHash } from "crypto";

export const MAIN = "main";

/** In-memory mapping: version (hash) → branch. Populated when we first see a draft. */
const versionToBranchMap = new Map<string, string>();

/** Sanitize for Git branch name */
function sanitize(s: string): string {
  return (s || "").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "x";
}

/** Build draft branch name from agent + token claims */
export function draftBranchName(agentId: string, sub?: string, sid?: string): string {
  const a = sanitize(agentId);
  const u = sanitize(sub || "anon");
  const s = sanitize(sid || "x");
  return `draft-${a}-${u}-${s}`;
}

/** Hash branch to short version (12 hex chars). Main stays "main". */
export function branchToVersion(branch: string): string {
  if (!branch || branch === MAIN) return MAIN;
  const hash = createHash("sha256").update(branch).digest("hex");
  const version = hash.slice(0, 12);
  versionToBranchMap.set(version, branch);
  return version;
}

/** Resolve version to branch. Main → main; hash → lookup (or null if unknown). */
export function versionToBranch(version: string): string | null {
  if (!version || version === MAIN) return MAIN;
  return versionToBranchMap.get(version) ?? null;
}

/** Extract branch from request: path version or query, or compute draft from auth. */
export function branchFromRequest(req: any, agentId: string): string {
  const version = versionFromRequest(req, agentId);
  if (version === MAIN) return MAIN;
  const branch = versionToBranch(version);
  if (branch) return branch;
  const draft = draftBranchName(agentId, req?.user?.authInfo?.token?.payload?.sub, req?.user?.authInfo?.token?.payload?.sid);
  branchToVersion(draft);
  return draft;
}

/** Extract version from request: path param, query, or derive from auth (hash of draft branch). */
export function versionFromRequest(req: cds.Request): string {
  const {agentId} = req?.data;

  const branch = draftBranchName(agentId, req?.user?.authInfo?.token?.payload?.sub, req?.user?.authInfo?.token?.payload?.sid);
  return branchToVersion(branch);
}

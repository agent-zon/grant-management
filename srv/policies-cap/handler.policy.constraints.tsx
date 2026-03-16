import cds from "@sap/cds";
import yaml from "js-yaml";
import getOctokit from "./git-handler/git-handler";
import { render } from "#cds-ssr";
import { GIT } from "./handler.policy";
import { McpCard } from "../../mcp-card";
import { inspect } from "util";
import { Octokit } from "octokit";

export type ConstraintMeta = { name: string; label: string; values: Set<string> };

const YAML_EXT = /\.(yaml|yml)$/i;

/** Normalize _meta key to constraint name (sap/riskLevel → riskLevel). */
function metaKeyToConstraintName(key: string): string {
  return key.startsWith("sap/") ? key.slice(4) : key;
}

/** Add meta key/value to constraints map (handles scalars, arrays, objects). */
function addMetaValue(byName: Map<string, ConstraintMeta>, key: string, value: unknown) {
  if (value == null) return;
  const name = metaKeyToConstraintName(key);
  let strings: string[] = [];
  if (Array.isArray(value)) {
    strings = value.filter((x) => x != null).map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)));
  } else if (typeof value === "object") {
    strings = [JSON.stringify(value)];
  } else {
    strings = [String(value)];
  }
  for (const str of strings) {
    if (!str) continue;
    let m = byName.get(name);
    if (!m) {
      m = { name, label: name, values: new Set() };
      byName.set(name, m);
    }
    m.values.add(str);
  }
}

/** Extract constraints and values from MCP card tools and _meta (all meta fields). */
export function extractConstraintsFromCard(card: any): ConstraintMeta[] {
  const byName = new Map<string, ConstraintMeta>();
  const add = (name: string, label: string, value: string) => {
    if (!value) return;
    let m = byName.get(name);
    if (!m) {
      m = { name, label, values: new Set() };
      byName.set(name, m);
    }
    m.values.add(String(value));
  };

  const tools = Array.isArray(card?.tools) ? card.tools : [];
  for (const tool of tools) {
    add("toolName", "toolName", tool.name);
    const meta = tool?._meta ?? {};
    for (const [k, v] of Object.entries(meta)) {
      if (v != null) addMetaValue(byName, k, v);
    }
  }
  const serverMeta = card?._meta ?? {};
  for (const [k, v] of Object.entries(serverMeta)) {
    if (v != null) addMetaValue(byName, k, v);
  }
  return Array.from(byName.values());
}

/** Fetch all MCP card contents for an agent via GraphQL (single query). */
export async function loadMcpCards(
  octokit: Octokit,
  agentId: string,
  ref: string
): Promise<{ name: string; content: string }[]> {

  const expression = `${ref}:${agentId}/mcps`;

  const branch = await octokit.rest.repos.getBranch({
    owner: GIT.owner,
    repo: GIT.repo,
    branch: ref,
  })
    .then(({ data }) => data.commit.sha)
    .catch(() => "main");

  const files = await octokit.rest.repos.getContent({
    owner: GIT.owner,
    repo: GIT.repo,
    path: `${agentId}/mcps`,
    ref: branch,
  });

  const yamls = (files.data as any[])
    .filter(f => f.type === "file" && f.name.match(/\.ya?ml$/));

  return await Promise.all(
    yamls.map(async f => {
      const res = await octokit.rest.repos.getContent({
        owner: GIT.owner,
        repo: GIT.repo,
        path: f.path,
        ref: branch,
      });

      const content = Buffer.from(
        (res.data as any).content,
        "base64"
      ).toString("utf8");

      return { name: f.name, content };
    })
  );
}
export async function loadMcpCardsViaGraphql(
  octokit: any,
  agentId: string,
  version: string
): Promise<{ name: string; content: string }[]> {
  const ref = await octokit.rest.repos.getBranch({
    owner: GIT.owner,
    repo: GIT.repo,
    branch: version,
  })
    .then(({ data }) => data.commit.sha)
    .catch(() => "main");

  const expression = `${ref}:${agentId}/mcps`;

  const { repository } = await octokit.graphql(
    `
    query GetMcpCards($owner: String!, $repo: String!, $expression: String!) {
      repository(owner: $owner, name: $repo) {
        mcps: object(expression: $expression) {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Blob {
                  text
                  byteSize
                  oid
                }
              }
            }
          }
        }
      }
    }
    `,
    {
      owner: GIT.owner,
      repo: GIT.repo,
      expression,
    }
  );

  if (!repository?.mcps?.entries) return [];

  return repository.mcps.entries
    .filter((e: any) =>
      e.type === "blob" &&
      (e.name.endsWith(".yaml") || e.name.endsWith(".yml"))
    )
    .map((e: any) => ({
      name: e.name,
      content: e.object?.text ?? "",
      ...yaml.load(e.object?.text ?? "") as McpCard,
    }));

    const isYaml = <T extends { type: string; object: { text: string }; name: string }>(e: T): e is T & { type: "blob"; object: { text: string }; name: string } => e.type === "blob" && !!e.object?.text && YAML_EXT.test(e.name ?? "");

}
/** Decode target value to resource id (mcp|id|name → id). */
function targetToResourceId(target: string | undefined): string | null {
  if (!target?.trim()) return null;
  const parts = target.split("|");
  if (parts.length >= 2) return parts[1];
  return null;
}

/** Aggregate constraints from MCP cards. When resourceId given, use only that card; else use all. */
export async function getConstraints(
  agentId: string,
  ref: string,
  target: string | undefined
): Promise<ConstraintMeta[]> {
  const octokit = await getOctokit();
  const resourceId = targetToResourceId(target);
  const cards = await loadMcpCardsViaGraphql(octokit, agentId, ref);

  const merged = new Map<string, ConstraintMeta>();

  for (const { name: cardName, content } of cards) {
    if (resourceId && cardName !== resourceId) continue;
    try {
      const card = yaml.load(content) as any;
      for (const c of extractConstraintsFromCard(card)) {
        const existing = merged.get(c.name);
        if (!existing) {
          merged.set(c.name, { ...c, values: new Set(c.values) });
        } else {
          for (const v of c.values) existing.values.add(v);
        }
      }
    } catch {
      /* skip parse errors */
    }
  }
  return Array.from(merged.values());
}

const DEFAULT_CONSTRAINT_VALUES: Record<string, string[]> = {
  riskLevel: ["low", "medium", "high", "sensitive", "critical"],
  accessLevel: ["public", "authenticated-user", "restricted"],
  dataClassification: ["internal", "confidential", "restricted", "public"],
  environment: ["development", "staging", "production"],
};

/** Get values for a specific constraint. */
export async function getConstraintValues(
  agentId: string,
  ref: string,
  target: string | undefined,
  constraint: string
): Promise<string[]> {
  const constraints = await getConstraints(agentId, ref, target);
  return toConstraintValues(constraint, constraints);
}

function toConstraintValues(constraint: string, constraints: ConstraintMeta[]) {
  const c = constraints.find((x) => x.name === constraint);
  const fromCards = c ? Array.from(c.values) : [];
  const defaults = DEFAULT_CONSTRAINT_VALUES[constraint] ?? [];
  const combined = [...new Set([...fromCards, ...defaults])];
  return combined.sort();
}



export async function RESOURCE_CONSTRAINTS(req: cds.Request) {
  const { resource } = req.data || {};
  const constraints = extractConstraintsFromCard(resource);

  const defaults = [
    { name: "toolName", label: "toolName" },
    { name: "riskLevel", label: "riskLevel" },
    { name: "accessLevel", label: "accessLevel" },
    { name: "dataClassification", label: "dataClassification" },
    { name: "environment", label: "environment" },
  ];
  const known = new Set(constraints.map((c) => c.name));
  for (const d of defaults) {
    if (!known.has(d.name)) constraints.push({ name: d.name, label: d.label, values: new Set() });
  }

  return render(
    req,
    <>
      <option value="">No constraint</option>
      {constraints.map((c) => (
        <option key={c.name} value={c.name}>
          {c.label}
        </option>
      ))}
    </>
  );

}
export async function RESOURCE_CONSTRAINT_VALUES(req: cds.Request) {
  const { resource } = req.data || {};
  const constraint = req.query?.['constraint'] || req.data?.['constraint'];
  const values = toConstraintValues(constraint, extractConstraintsFromCard(resource));
  return render(req, <>
    {values.map((v) => (
      <option key={v} value={v} />
    ))}
  </>);
}

/** GET .../constraintValues → HTML datalist options for constraint value input. */
export async function CONSTRAINT_VALUES(this: any, req: cds.Request) {
  const constraint = req.data?.['constraint'] || req.query?.['constraint'];
  const { version, agentId } = req.data || {};
  console.log("CONSTRAINT_VALUES", constraint, version, agentId, req.data, req.query);

  const octokit = await getOctokit();
  const mcps = await loadMcpCardsViaGraphql(octokit, agentId, version);

  const values = toConstraintValues(constraint, mcps
    .flatMap(extractConstraintsFromCard))
    .filter(unique);

  return render(
    req,
    <>
      {values.map((v) => (
        <option key={v} value={v} />
      ))}
    </>
  );
  function unique<T>(value: T, index: number, self: T[]): boolean {
    return self.indexOf(value) === index;
  }
}



/** GET .../constraints → HTML options for constraint select. */
export async function CONSTRAINTS(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  console.log("CONSTRAINTS", agentId, version, req.params);
  const octokit = await getOctokit();
  const mcps = await loadMcpCardsViaGraphql(octokit, agentId, version);
  console.log("MCPS", inspect(mcps, { depth: 3 }));
  const constraints = mcps.map(({ content, name }) => ({
    id: name,
    name,
    ...yaml.load(content) as McpCard,
  }))
    .flatMap(extractConstraintsFromCard)
    .filter(unique);

  function unique<T>(value: T, index: number, self: T[]): boolean {
    return self.indexOf(value) === index;
  }

  return render(
    req,
    <>
      <option value="">No constraint</option>
      {constraints.map((c) => (
        <option key={c.name} value={c.name}>
          {c.label}
        </option>
      ))}
    </>
  );
}

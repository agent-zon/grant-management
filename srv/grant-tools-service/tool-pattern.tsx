/**
 * ODRL-based tool authorization stored in grant authorization_details.tools.
 *
 * Storage format (ODRL):
 *   { permission: [{ target: "*", action: "use" }], prohibition: [] }
 *
 * Pattern matching:
 *   "*"          → matches every tool
 *   "prefix.*"   → matches tools starting with "prefix."
 *   "exact.name" → exact match only
 */

export type OdrlRule = { target: string; action: string };
export type OdrlTools = { permission?: OdrlRule[]; prohibition?: OdrlRule[] };

export function matchToolPattern(pattern: string, toolName: string): boolean {
  if (pattern === "*") return true;
  if (pattern === toolName) return true;
  if (pattern.endsWith(".*")) {
    return toolName.startsWith(pattern.slice(0, -1));
  }
  return false;
}

/** Is the tools Map in ODRL format? */
export function isOdrl(tools: Record<string, any>): tools is OdrlTools {
  return Array.isArray(tools?.permission) || Array.isArray(tools?.prohibition);
}

/** Extract permitted target patterns from tools (handles both ODRL and legacy flat map). */
export function permittedPatterns(tools: Record<string, any>): string[] {
  if (isOdrl(tools)) {
    return (tools.permission || []).map((r: OdrlRule) => r.target);
  }
  return Object.keys(tools).filter((k) => tools[k] !== false);
}

/** Extract prohibited target patterns from ODRL tools. */
export function prohibitedPatterns(tools: Record<string, any>): string[] {
  if (isOdrl(tools)) {
    return (tools.prohibition || []).map((r: OdrlRule) => r.target);
  }
  return Object.keys(tools).filter((k) => tools[k] === false);
}

/** Check if a tool is authorized by the grant's ODRL (or legacy) tools. */
export function isToolAuthorized(toolName: string, tools: Record<string, any>): boolean {
  const denied = prohibitedPatterns(tools);
  if (denied.some((p) => matchToolPattern(p, toolName))) return false;

  const allowed = permittedPatterns(tools);
  return allowed.some((p) => matchToolPattern(p, toolName));
}

/** Build ODRL tools from a list of target patterns (all as permissions). */
export function toOdrl(targets: string[]): OdrlTools {
  return {
    permission: targets.map((t) => ({ target: t, action: "use" })),
    prohibition: [],
  };
}

/**
 * Convert flat checkbox form data ({ "todos_create": true, "admin_delete": false })
 * into ODRL stored in the grant. Underscores that were dots get restored.
 */
export function flatMapToOdrl(flat: Record<string, any>): OdrlTools {
  const permission: OdrlRule[] = [];
  const prohibition: OdrlRule[] = [];

  for (const [key, value] of Object.entries(flat)) {
    // Restore dots: form-json uses underscores for dots in field names
    // __star__ was used for "*" in form fields
    const target = key.replace(/__star__/g, "*").replace(/_/g, ".");
    if (value === false) {
      prohibition.push({ target, action: "use" });
    } else if (value) {
      permission.push({ target, action: "use" });
    }
  }

  return { permission, prohibition };
}

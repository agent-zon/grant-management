---
name: ams-btp-dcl
description: Author and review SAP BTP Data Control Language (DCL) for AMS authorization—schema.dcl, POLICY/GRANT/WHERE, DEFAULT/INTERNAL policies, operators, annotations, packages, tenant schema, and safe upgrades to delivered policies. Use when editing .dcl files, AMS policies, authorization models, or when the user mentions DCL, schema.dcl, GRANT/RESTRICT/USE, or AMS base vs admin policies.
---

# AMS BTP Data Control Language (DCL)

## When to use this skill

- Writing or reviewing `*.dcl` (authorization model: attributes + policies).
- Explaining `SCHEMA`, `POLICY`, `GRANT`, `WHERE`, `USE` / `RESTRICT`, `DEFAULT` / `INTERNAL`.
- Planning changes to **delivered** (base) policies without breaking derived admin policies.

## Deep reference

Repo-local AMS language docs under `.cursor/AMS/DCLLanguage/` (read as needed). Paths relative to this skill file:

- [Declare.md](../../AMS/DCLLanguage/Declare.md) — overview, attributes, base policies, DEFAULT / INTERNAL
- [SchemaAndAttributes.md](../../AMS/DCLLanguage/SchemaAndAttributes.md) — types, `$user`, attribute constraints
- [Operators.md](../../AMS/DCLLanguage/Operators.md) — condition operators and LIKE
- [Annotations.md](../../AMS/DCLLanguage/Annotations.md) — `@description`, `@label`, `@valueHelp`; deprecated `@default` / `@internal`
- [Formats.md](../../AMS/DCLLanguage/Formats.md) — identifiers, strings, escaping, generator hints
- [NamingConventions.md](../../AMS/DCLLanguage/NamingConventions.md) — policy/action/resource/attribute names
- [PackageDefinitions.md](../../AMS/DCLLanguage/PackageDefinitions.md) — folders as packages, qualified names, multi-tenant
- [ChangesToDeliveredPolices.md](../../AMS/DCLLanguage/ChangesToDeliveredPolices.md) — allowed vs forbidden upgrades

## Core concepts

1. **Attributes** — Declared first in a single root `schema.dcl` so the compiler can type-check policy conditions.
2. **Policies** — Named bundles of **rules**: each rule **grants** actions on resources with optional **WHERE** conditions.
3. **Base policies** — Shipped with the app; admins often derive **admin policies** with `USE` + `RESTRICT` (parameterized restrictions).
4. **Actions / resources** — Not declared in the schema; they are identifiers used by the app and AMS.

## SCHEMA (`schema.dcl`)

- Exactly **one** `SCHEMA { ... }` per package hierarchy; file should live at the **root** of the hierarchy and (recommended) contain **only** the schema.
- Types: `String`, `Number`, `Boolean`, each with optional `[]` for arrays; nested **structures** `{ field: Type, ... }`.
- Root names may be prefixed with `$` (environment section). **`$user`** is injected by default (from 0.9.0) if not overridden:

```text
$user: { user_uuid: String, email: String, groups: String[] }
```

Override allowed only as a **structure**; client libraries map OIDC claims to `$user` fields.

## Policy syntax (typical)

```sql
POLICY Example {
  GRANT post, show ON accountingDocuments
    WHERE AccDocHdr.CompanyCode IS RESTRICTED
      AND AccDocItm.BusinessArea IS RESTRICTED;
}
```

Admin-style reuse: `USE` imports a base (or other) policy; `RESTRICT` supplies values for attributes that were `IS (NOT) RESTRICTED` in the base:

```sql
POLICY salesOrderRestricted {
  USE myPackage.salesOrders
    RESTRICT Country = 'DE';
}
```

Qualified names: `sales.basic.salesOrder` = policy `salesOrder` in package `sales.basic`.

- **`IS RESTRICTED` / `IS NOT RESTRICTED`** — Access denied/allowed until relaxed or constrained via `RESTRICT` in a `USE` statement (admin policy pattern). Do **not** use these in **function** definitions.
- **`IS NULL`** — Attribute has no value.

## DEFAULT and INTERNAL policies

- **`DEFAULT POLICY name { ... }`** — Always evaluated at runtime; **not** assignable to users. Tenant-specific defaults may exist but UI support may lag.
- **`INTERNAL POLICY name { ... }`** — For technical / App2App flows; passed by app code to the decision engine; **not** assignable; **cannot** combine with DEFAULT.

**Deprecated:** `@default: TRUE` → use `DEFAULT POLICY`. `@internal` → use `INTERNAL POLICY`.

## Annotations

| Annotation   | Purpose |
| ------------ | ------- |
| `@description: '...'` | Human description of the policy |
| `@label: '...'`       | Customer-editable display name |
| `@valueHelp: false` or `{ path, valueField, labelField }` | On schema attributes (see AMS Value Help docs for full conventions) |

## Condition operators (summary)

`=`, `<>`, `<`, `>`, `<=`, `>=`, `IN`, `NOT IN`, `BETWEEN ... AND`, `NOT BETWEEN`, `LIKE` / `NOT LIKE` (with optional `ESCAPE`). LIKE: `%` = any length, `_` = single char.

## Identifiers and strings

- Unquoted identifiers: Unicode letter-like start + letters/digits (similar to Java); **case-sensitive** (`Customer` ≠ `CUSTOMER`).
- **Keywords are case-insensitive.**
- Use **double-quoted** identifiers for reserved words or special characters; escape `"` as `\"` inside quotes.
- **String constants** use **single quotes** `'`; escape `'` and `\` in generated code.
- Policy names: **1–127** characters; unique per policy. Same type = no duplicate names.

## Packages (directory = package)

- Folder names must match `[a-zA-Z_][a-zA-Z_0-9]*`; **`_dcl_`** not allowed in package names; max **250** chars full path.
- Reserved: package **`dcr`** (runtime internal); **`local`** — policies under `local` are for local testing (not uploaded / not visible to customers).
- **Qualified references:** `sales.salesOrder` = policy `salesOrder` in package path `sales`.
- **Cross-package reuse:** policies/functions visible with fully qualified names; **one global schema** for the hierarchy.
- **Multi-tenant:** `TENANT SCHEMA '<tenant-id>' { }` in any `*.dcl` of a package marks tenant-specific content (not reusable); runtime evaluates non-tenant packages + matching tenant package.

## Delivered (base) policy changes — compatibility

**Allowed (typical):** add new policies; add conditions; remove/change conditions **except** `IS (NOT) RESTRICTED`; add new attributes (including new `IS (NOT) RESTRICTED` uses).

**Forbidden / breaks admin `USE` + `RESTRICT`:** delete policies; rename policies; move policies to another package; remove or change `IS (NOT) RESTRICTED` conditions on existing attributes; delete restricted/unrestricted attributes from a policy; toggle `DEFAULT` or `INTERNAL`; moving a policy to another **file** in the same package is treated as a **new** policy (assignments lost).

Inform customers and allow migration when breaking changes are unavoidable.

## Agent checklist

- [ ] `schema.dcl` at root, single `SCHEMA`, types match usage in `WHERE`.
- [ ] Prefer parameterized restrictions (`IS RESTRICTED`) for reusable base policies.
- [ ] Use `DEFAULT POLICY` / `INTERNAL POLICY`, not deprecated annotations.
- [ ] Respect package naming and reserved names (`dcr`, `local`, no `_dcl_`).
- [ ] Before changing shipped policies, verify against **allowed/forbidden** lists above.

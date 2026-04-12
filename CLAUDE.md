# Project Instructions

## No Dynamic Imports

Always use static `import` statements. Never use `await import(...)` or dynamic `import()` unless there is no alternative (e.g., conditional loading of an optional dependency that may not be installed).

**Why:** CDS runs `server.js` through `cds-tsx`, which transpiles TypeScript imports at runtime. Dynamic imports (`await import("./foo.js")`) resolve to a separate module instance from static imports in handler files. This causes shared state (event emitters, connection registries, key material) to be invisible across module boundaries — the exact bug class we hit with JWT keys and SSE connections.

**How to apply:** In `server.js` and all handler files, use top-level `import { foo } from "./bar.js"` for project modules. The `.js` extension resolves to `.ts` files automatically under `cds-tsx`.

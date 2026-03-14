# Policies Service E2E Tests

Playwright E2E tests for the policies-service (Agent Policies UI).

## Prerequisites

1. **Browsers**: Run `npx playwright install chromium` (or `npm install` runs it via postinstall)
2. **App running**: Start the app router + CAP (e.g. `npm run serve` or `npm run hybrid:cds`)
3. **IAS login** (when using app router on port 5000): Set `TEST_PASSWORD` for `agently.io@gmail.com`

## Running Tests

```bash
# With IAS (app router on port 5000) - password required
TEST_PASSWORD=yourpassword npm run test:e2e:policies

# Custom URL (e.g. stage)
TEST_URL=https://your-stage-url.com TEST_PASSWORD=xxx npm run test:e2e:policies

# Direct CAP (port 4004) - no IAS, for local dev without app router
TEST_URL=http://localhost:4004 npm run test:e2e:policies

# UI mode (debug)
TEST_PASSWORD=xxx npm run test:e2e:policies:ui
```

## Environment Variables

| Variable        | Default                 | Description                    |
|----------------|-------------------------|--------------------------------|
| `TEST_URL`     | `http://localhost:5000` | Base URL of the app            |
| `TEST_USER`    | `agently.io@gmail.com`  | Username for IAS login         |
| `TEST_PASSWORD`| (required for IAS)      | Password for IAS login         |

## Test Coverage

- Agents list view
- Sidebar filter
- Agent selection → edit panel
- Rules section visibility
- Save button
- Direct URL navigation (view, edit redirect)

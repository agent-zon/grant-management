# Custom CDS Add: CDC Integration

## Overview

This project includes a custom CDS build plugin for CDC (Customer Data Cloud) integration. The plugin automatically generates CDC model definitions and setup scripts from your CDS model definitions.

## What is the CDC Build Plugin?

The CDC build plugin (`srv/cdc/cdc-plugin.cjs`) is a custom CDS build task that:

1. **Analyzes your CDS models** - Scans entities for CDC-related annotations and patterns
2. **Generates CDC model definitions** - Creates group models and schemas
3. **Generates account schemas** - Defines user/subject data structures
4. **Creates setup scripts** - Produces executable scripts to configure CDC

## Installation & Registration

### Plugin Registration

The plugin is auto-registered via `cds-plugin.js` in the project root:

```javascript
// cds-plugin.js
const cds = require("@sap/cds");

if (cds.build?.register) {
  require("./srv/cdc/cdc-plugin.cjs");
  console.log("✓ CDC build plugin registered");
}
```

### Package Configuration

CDC build scripts are configured in `package.json`:

```json
{
  "scripts": {
    "build:cdc": "npx cds build --for cdc",
    "build:cdc:setup": "npx cds build --for cdc && node gen/cdc/setup-cdc.js"
  }
}
```

## Usage

### 1. Basic CDC Build

Generate CDC model definitions from your CDS schema:

```bash
npm run build:cdc
# or
cds build --for cdc
```

**Output**: `gen/cdc/` directory containing:

- `cdc-models.json` - CDC model definitions
- `setup-cdc.js` - Executable setup script
- `package.json` - Dependencies for setup script

### 2. Build and Setup

Generate models AND execute setup against CDC:

```bash
npm run build:cdc:setup
```

This will:

1. Build CDC models from CDS definitions
2. Execute the generated setup script
3. Create group models in CDC
4. Set group schemas in CDC
5. Configure account schemas in CDC

### 3. Manual Setup

If you want to review models before setup:

```bash
# Generate models
npm run build:cdc

# Review generated files
cat gen/cdc/cdc-models.json

# Run setup when ready
node gen/cdc/setup-cdc.js
```

## CDS Annotations for CDC

You can control CDC model generation using annotations:

### Group Model Annotations

```cds
// Explicit CDC group model
@cdc.model: 'grant'
@cdc.selfProvisioning: true
entity Grants {
  key ID: String;
  client_id: String;
  status: String;
  // ...
}

// Auto-detected (name includes 'Grant')
entity GrantScopes {
  // Automatically becomes CDC group model
}
```

### Account Schema Annotations

```cds
// Mark entity for account schema
@cdc.type: 'account'
entity Users {
  key ID: String;

  // Profile fields (auto-detected or annotated)
  @cdc.profile
  firstName: String;

  @cdc.profile
  lastName: String;

  email: String; // Auto-detected as profile

  // Subscription fields
  @cdc.subscription
  newsletter_consent: Boolean;

  // Data fields (everything else)
  preferences: String;
}
```

### Relationship Data Annotations

```cds
entity GrantMembers {
  key ID: String;

  // Relationship fields (auto-detected)
  @cdc.relationship
  role: String;

  scope: String; // Auto-detected as relationship
  permissions: String; // Auto-detected as relationship

  // Group data fields
  member_since: DateTime;
}
```

## Auto-Detection Rules

If you don't use explicit annotations, the plugin auto-detects:

### Group Models

- Entity name contains `Grant` → Creates CDC group model
- Entity name contains `Consent` → Creates CDC group model

### Account Schema

- Entity name contains `User`, `Account`, or `Subject`
- Fields named `firstName`, `lastName`, `email`, `username`, `birthDate` → Profile schema
- Fields containing `subscription` or `consent` → Subscriptions schema
- All other fields → Data schema

### Relationship Data

- Fields named `role`, `scope`, `permissions` → Relationship data
- Other fields → Group data

## Generated Output

### cdc-models.json

```json
{
  "models": [
    {
      "model": "grant",
      "selfProvisioning": true,
      "description": "One group = one OAuth grant snapshot"
    },
    {
      "model": "consent",
      "selfProvisioning": true,
      "description": "One group = one consent with independent lifecycle"
    }
  ],
  "schemas": {
    "grant": {
      "groupDataSchema": {
        "id": { "type": "string" },
        "client_id": { "type": "string" },
        "status": { "type": "string" }
        // ...
      },
      "relationshipDataSchema": {
        "role": { "type": "string" },
        "scope": { "type": "string" }
        // ...
      }
    }
  },
  "accountSchema": {
    "profileSchema": {
      "firstName": { "type": "string" },
      "lastName": { "type": "string" }
      // ...
    },
    "dataSchema": {
      "preferences": { "type": "object" }
    },
    "subscriptionsSchema": {
      "newsletter_consent": { "type": "boolean" }
    }
  }
}
```

### setup-cdc.js

Executable Node.js script that:

1. Configures CDC destination (`cdc-accounts-api`)
2. Creates all group models
3. Sets group schemas
4. Configures account schema
5. Reports results with detailed logging

## Type Mapping

CDS types are automatically mapped to CDC types:

| CDS Type                                    | CDC Type  |
| ------------------------------------------- | --------- |
| `cds.String`                                | `string`  |
| `cds.Integer`, `cds.Integer64`              | `integer` |
| `cds.Double`, `cds.Decimal`                 | `number`  |
| `cds.Boolean`                               | `boolean` |
| `cds.Date`, `cds.DateTime`, `cds.Timestamp` | `string`  |
| `cds.UUID`                                  | `string`  |

## Advanced Configuration

### Custom Build Task

Add CDC build to your build tasks in `package.json` or `.cdsrc.json`:

```json
{
  "cds": {
    "build": {
      "tasks": [
        { "for": "nodejs" },
        { "for": "hana" },
        { "for": "cdc", "src": "db" }
      ]
    }
  }
}
```

### Plugin Customization

Extend the plugin in `srv/cdc/cdc-plugin.cjs`:

```javascript
cds.build.register(
  "cdc",
  class CDCBuildPlugin extends cds.build.Plugin {
    static taskDefaults = {
      src: cds.env.folders.db || "db",
      dest: "gen/cdc",
    };

    static hasTask() {
      // Custom detection logic
      return cds.requires?.["cdc-accounts-api"] || process.env.CDC_API_KEY;
    }

    // Override methods as needed
  }
);
```

## Prerequisites

### CDC Destination

Ensure you have a CDC destination configured:

```bash
# Check if destination exists
cds bind --list

# Bind CDC destination
cds bind -2 cdc-accounts-api --on k8s
```

### Environment Variables

For local development without destination:

```bash
export CDC_API_KEY=your_api_key
export CDC_SECRET_KEY=your_secret
export CDC_DATA_CENTER=us1.gigya.com
```

## Integration with CI/CD

### Build Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Build CDC Models
  run: npm run build:cdc

- name: Setup CDC
  run: node gen/cdc/setup-cdc.js
  env:
    CDC_API_KEY: ${{ secrets.CDC_API_KEY }}
    CDC_SECRET_KEY: ${{ secrets.CDC_SECRET_KEY }}
```

### Helm Deployment

Include CDC setup as init container or job:

```yaml
# chart/templates/cdc-setup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cdc-setup
spec:
  template:
    spec:
      containers:
        - name: setup
          image: your-image
          command: ["node", "gen/cdc/setup-cdc.js"]
```

## Troubleshooting

### Plugin Not Registered

```bash
# Check if plugin is loaded
cds build --help | grep cdc
```

If not listed, ensure `cds-plugin.js` is in project root.

### Build Fails

```bash
# Enable detailed logging
DEBUG=cds:build npm run build:cdc

# Check CDS configuration
cds env
```

### Setup Script Errors

```bash
# Test CDC connection first
node -e "require('@gigya/destination').configureDestination({destinationName:'cdc-accounts-api'})"

# Check destination bindings
cds env requires --resolve-bindings --profile hybrid
```

## Examples

### Minimal Grant Model

```cds
// db/grants.cds
entity Grants {
  key ID: String;
  clientID: String;
  status: String;
}
```

**Generated**:

- CDC group model: `grant`
- Schema with: `ID`, `clientID`, `status` fields

### Complete Example with Annotations

```cds
// db/grants.cds
@cdc.model: 'oauth_grant'
@cdc.selfProvisioning: true
entity OAuthGrants {
  key ID: String;
  clientID: String;
  status: String;

  @cdc.relationship
  subject_role: String;
}

@cdc.type: 'account'
entity GrantSubjects {
  key ID: String;

  @cdc.profile
  email: String;

  @cdc.profile
  name: String;

  grant_count: Integer;
}
```

**Generated**:

- Group model: `oauth_grant` with custom schema
- Account schema with profile and data fields

## Best Practices

1. **Use Annotations**: Be explicit about CDC mappings
2. **Review Before Setup**: Always check `cdc-models.json` before running setup
3. **Version Control**: Commit generated files for review
4. **Test Locally**: Test CDC setup with hybrid profile first
5. **Idempotent Setup**: The setup script is safe to run multiple times

## Related Documentation

- [Grant Management Protocol](../../docs/mdc/grant_managmant_api.mdc)
- [CDC Integration Guide](.tasks/cdc-integration/docs/how-to-integrate-cdc.md)
- [CDS Build Documentation](./custom-build.md)
- [Task Documentation](.tasks/cdc-integration/TASK_DEFINITION.md)

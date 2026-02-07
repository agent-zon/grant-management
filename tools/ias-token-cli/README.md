# IAS Token CLI

CLI tool to fetch access tokens from SAP IAS (Identity Authentication Service) using various OAuth 2.0 grant types.

## Installation

This package is part of the grant-management monorepo. Install dependencies:

```bash
cd tools/ias-token-cli
npm install
```

Or from the root:

```bash
npm install
```

## Usage

**Important:** This CLI must be run with `npx cds bind` to access auth credentials:

```bash
npx cds bind --profile hybrid --exec -- ias-token-cli <command> [options]
```

### Commands

#### Password Grant (User Token)

```bash
# Using command-line arguments
npx cds bind --profile hybrid --exec -- ias-token-cli password -u myuser@example.com -p mypassword
npx cds bind --profile hybrid --exec -- ias-token-cli password --user myuser@example.com --password mypassword

# Using environment variables (password command will read TEST_USER/TEST_PASSWORD)
TEST_USER=myuser@example.com TEST_PASSWORD=mypassword npx cds bind --profile hybrid --exec -- ias-token-cli password

# Short alias
npx cds bind --profile hybrid --exec -- ias-token-cli pw -u user@example.com -p pass
```

#### Client Credentials Grant

```bash
# Basic usage
npx cds bind --profile hybrid --exec -- ias-token-cli client-credentials

# With custom audience
npx cds bind --profile hybrid --exec -- ias-token-cli client-credentials -a <client-id>

# With resource
npx cds bind --profile hybrid --exec -- ias-token-cli client-credentials -r grant-mcp

# With custom binding
npx cds bind --profile hybrid --exec -- ias-token-cli client-credentials -b <binding-name>

# Short alias
npx cds bind --profile hybrid --exec -- ias-token-cli cc
```

#### Token Exchange Grant

```bash
npx cds bind --profile hybrid --exec -- ias-token-cli exchange -t <subject-token>
npx cds bind --profile hybrid --exec -- ias-token-cli exchange --token <subject-token>

# Short alias
npx cds bind --profile hybrid --exec -- ias-token-cli ex -t <subject-token>
```

### Options

#### Common Options

- `-b, --binding <binding>` - What binding to use (default: "auth")
- `-q, --quiet` - Suppress all output except token (for scripting)

#### Password Command Options

- `-u, --user <username>` - Username (or use TEST_USER env var)
- `-p, --password <password>` - Password (or use TEST_PASSWORD env var)

#### Client Credentials Command Options

- `-r, --resource <resource>` - Add resource (e.g., grant-mcp)
- `-a, --audience <audience>` - Add audience, default to binding client id

#### Exchange Command Options

- `-t, --token <token>` - Subject token to exchange (required)

### Quiet Mode (for Scripting)

```bash
# Suppress all output except the token
npx cds bind --profile hybrid --exec -- ias-token-cli password -u user@example.com -p pass -q

# Use in command substitution
TOKEN=$(npx cds bind --profile hybrid --exec -- ias-token-cli password -u user@example.com -p pass -q)
```

## Environment Variables

- `TEST_USER` - Username for password grant (alternative to `--user` flag)
- `TEST_PASSWORD` - Password for password grant (alternative to `--password` flag)
- `APPROUTER_CLIENT_ID` - Audience/client ID for client credentials grant (if not using `--audience`)

## Output

The tool outputs the access token to stdout (with a newline), making it suitable for use in command substitution and shell scripts.

All debug information and errors are written to stderr, so they won't interfere with token capture in scripts.

## Examples

```bash
# Get token and use it in a header
TOKEN=$(npx cds bind --profile hybrid --exec -- ias-token-cli password -u user@example.com -p pass -q)
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/endpoint

# Get client credentials token with resource
TOKEN=$(npx cds bind --profile hybrid --exec -- ias-token-cli client-credentials -r grant-mcp -q)

# Get token and save to file
npx cds bind --profile hybrid --exec -- ias-token-cli password -u user@example.com -p pass -q > token.txt

# Get token with verbose output (interactive)
npx cds bind --profile hybrid --exec -- ias-token-cli password -u user@example.com -p pass
```

## Requirements

- SAP CAP project with auth service configured
- `cds bind --profile hybrid` must be run to bind auth credentials
- Or auth credentials must be configured in `cds.env.requires.auth.credentials`

## License

ISC

# WSG-Check

[![CI](https://github.com/ivanoats/wsg-check/actions/workflows/ci.yml/badge.svg)](https://github.com/ivanoats/wsg-check/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ivanoats/wsg-check/branch/main/graph/badge.svg)](https://codecov.io/gh/ivanoats/wsg-check)

Check a website against automated heuristics based on the [W3C Web Sustainability Guidelines](https://www.w3.org/TR/web-sustainability-guidelines/). Get a weighted score, recommendations, and reports in terminal, JSON, Markdown, or HTML format through a CLI or a Next.js web app.

## Release status

The latest release is v0.4.0. It targets WSG July-2026 (Group Note Draft) and adds the `wsg-check-mcp` server for AI assistants, with the `check_url`, `list_guidelines`, and `get_guideline` tools. v0.3.0 was tagged on GitHub but not published to npm; use v0.4.0 or later. See the [changelog](CHANGELOG.md) and [spec versioning policy](SPEC_VERSIONING.md).

Scores from different spec versions should not be treated as directly comparable. The package version and check selection also matter when comparing reports.

## Quick start

Requires Node.js 22 or later. Pin the released CLI for reproducible usage:

```bash
npx @sustainablewebsites/wsg-check@0.4.0 https://example.com

# Or install globally
npm install -g @sustainablewebsites/wsg-check@0.4.0
wsg-check https://example.com --format json --output report.json
```

To run the current source, including unreleased features, use Node.js **22.22.1 or later** (required by development tooling):

```bash
git clone https://github.com/ivanoats/wsg-check.git
cd wsg-check
npm ci             # prepare also generates Panda CSS tokens
npm run dev        # http://localhost:3000

# Build and run the CLI from this checkout
npm run build:cli
node dist/cli/index.js https://example.com
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for environment configuration and development commands.

## What the results mean

- Checks cover web development, UX, and hosting. The business category has no automated checks.
- Analysis uses fetched HTML and HTTP metadata; it does not render JavaScript, measure Core Web Vitals, or download every referenced asset.
- CO₂ estimates use HTML bytes and the SWD v4 model, not measured full-page energy consumption. Failed green-hosting lookups fall back to `false`.
- Report page weight is the HTML document size; resource and third-party counts come from references in the HTML. Referenced assets are not downloaded or measured.
- Security headers, form validation, native form features, and image alternative text remain visible as **related checks**, excluded from WSG scores.

## CLI Usage

WSG-Check ships with a command-line tool that lets you check any website directly from your terminal or integrate checks into CI pipelines.

### Basic usage

```bash
# Check a website with default (terminal) output
npx @sustainablewebsites/wsg-check https://example.com

# Output as JSON
npx @sustainablewebsites/wsg-check https://example.com --format json

# Save the report to a file
npx @sustainablewebsites/wsg-check https://example.com --format markdown --output report.md

# Fail the process (exit 1) if the score is below 70
npx @sustainablewebsites/wsg-check https://example.com --fail-threshold 70
```

### Options

| Option                 | Alias | Description                                                                                                             | Default           |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `--format <format>`    | `-f`  | Output format: `terminal`, `json`, `markdown`, `html`                                                                   | `terminal`        |
| `--output <path>`      | `-o`  | Write report to a file instead of stdout                                                                                | _(stdout)_        |
| `--categories <list>`  | `-c`  | Comma-separated categories: `ux,web-dev,hosting` (`business` planned — no automated checks yet)                         | all               |
| `--guidelines <list>`  | `-g`  | Comma-separated guideline slugs to run, e.g. `minify-and-remove-unused-code` (numeric IDs such as `3.3` are deprecated) | all               |
| `--fail-threshold <n>` |       | Exit code 1 if overall score < _n_ (0–100)                                                                              | `0`               |
| `--verbose`            | `-v`  | Enable verbose logging                                                                                                  | `false`           |
| `--config <path>`      |       | Path to `wsg-check.config.json` or `.wsgcheckrc.json`                                                                   | _(auto-discover)_ |
| `--version`            |       | Print version and exit                                                                                                  |                   |
| `--help`               |       | Print help and exit                                                                                                     |                   |

### CI integration

Use `--fail-threshold` to fail your pipeline when a site's sustainability score drops:

```yaml
# .github/workflows/sustainability.yml
- name: Check sustainability
  run: npx @sustainablewebsites/wsg-check https://example.com --fail-threshold 60 --format json --output wsg-report.json
- name: Upload report
  uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
  with:
    name: wsg-report
    path: wsg-report.json
```

### Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | Check completed and score is at or above `--fail-threshold` |
| `1`  | Fetch/parse error, or score is below `--fail-threshold`     |

## Use with AI assistants (MCP)

The package includes `wsg-check-mcp`, a [Model Context Protocol](https://modelcontextprotocol.io) server for Claude Code, Claude Desktop, VS Code, Cursor, and other MCP clients. It runs on your machine over stdio, with no account, port, or hosted service. Your assistant can then check a deployed site or your local dev server, look up guidelines, and fix what it finds.

```bash
# Claude Code
claude mcp add wsg-check -- npx -y -p @sustainablewebsites/wsg-check wsg-check-mcp
```

Claude Desktop (`claude_desktop_config.json`) and Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "wsg-check": {
      "command": "npx",
      "args": ["-y", "-p", "@sustainablewebsites/wsg-check", "wsg-check-mcp"]
    }
  }
}
```

VS Code (`.vscode/mcp.json`) uses a `servers` key:

```json
{
  "servers": {
    "wsg-check": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "-p", "@sustainablewebsites/wsg-check", "wsg-check-mcp"]
    }
  }
}
```

Try prompts such as "Check http://localhost:3000 against the WSG and fix the top three issues" or "Which WSG guidelines cover web fonts?"

| Tool              | What it does                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_url`       | Checks a page and returns the score, grade, and each failed or warned check with a recommended fix. `detail: "full"` adds the complete report. |
| `list_guidelines` | Lists the WSG guidelines, filtered by category, testability, or text, with how many automated checks implement each one.                       |
| `get_guideline`   | Returns one guideline's description and W3C specification link.                                                                                |

### Network access

- **Local URLs are allowed by default**, so `http://localhost:3000` and other loopback addresses work without setup. The trade-off: text the assistant reads, such as a web page or a file in your project, could try to steer it into requesting a service on your machine. Requests are GET-only and the results go back to the assistant. If you don't check a local dev server, add `--no-local` after `wsg-check-mcp` in the arguments, or set `WSG_CHECK_NO_LOCAL=1`.
- **Private networks** (10/8, 172.16/12, 192.168/16) are blocked unless you add `--allow-private-network` or set `WSG_CHECK_ALLOW_PRIVATE=1`.
- The only other request `check_url` makes is a green-hosting lookup: it sends the hostname to the [Green Web Foundation](https://www.thegreenwebfoundation.org/). Local hostnames are never sent.
- Cloud metadata and other reserved addresses are always blocked. Redirects from a public site into your machine or network are refused, and each connection is pinned to the address that was checked.

## REST API

The web app exposes Next.js Route Handlers:

| Endpoint                  | Purpose                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `POST /api/check`         | Run a check and return the completed report and ID                           |
| `GET /api/check/:id`      | Retrieve a report from the process-local result store                        |
| `GET /api/guidelines`     | List guidelines; current source includes pinned spec provenance in `spec`    |
| `GET /api/guidelines/:id` | Look up a guideline; current source accepts slugs and legacy numeric aliases |
| `GET /api/health`         | Health status; current source includes package `version` and `specVersion`   |
| `GET /api/openapi`        | OpenAPI 3.1 JSON document (no interactive documentation UI)                  |

Responses use CORS headers, shared error envelopes, and in-memory rate limiting. Stored results expire after one hour and the store holds at most 500 entries. Results and limits are not shared across server instances. The browser carries newly created reports through `sessionStorage`; result URLs are not durable share links. See [runtime and storage](docs/architecture.md#runtime-and-storage).

## Architecture and documentation

The CLI, web API, and MCP server share a TypeScript fetch → check → score → report pipeline. The code is layered and framework-independent at its core, with direct dependencies on concrete utility implementations. The [architecture overview](docs/architecture.md) documents these boundaries and the external-I/O exceptions.

- [Documentation index](docs/README.md)
- [Architecture Decision Log (ADL)](docs/adl.md) and [ADR template](docs/adr/template.md)
- [Module and check reference](docs/reference.md)
- [WSG spec versioning](SPEC_VERSIONING.md)
- [Contributing](CONTRIBUTING.md), [releasing](RELEASING.md), and [changelog](CHANGELOG.md)
- [Executive summary](Executive-Summary.md) and [implementation plan](IMPLEMENTATION_PLAN.md) — historical planning context; use the architecture overview for implemented behavior

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE) and the [Contributor License Agreement](CLA.md).

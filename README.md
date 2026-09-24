# WSG-Check

[![CI](https://github.com/ivanoats/wsg-check/actions/workflows/ci.yml/badge.svg)](https://github.com/ivanoats/wsg-check/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ivanoats/wsg-check/branch/main/graph/badge.svg)](https://codecov.io/gh/ivanoats/wsg-check)

Check a website against automated heuristics based on the [W3C Web Sustainability Guidelines](https://www.w3.org/TR/web-sustainability-guidelines/). Get a weighted score, recommendations, and reports in terminal, JSON, Markdown, or HTML format through a CLI or a Next.js web app.

## Release status

As of September 24, 2026, the latest GitHub release is [v0.1.2](https://github.com/ivanoats/wsg-check/releases/tag/v0.1.2). Current `main` includes **unreleased** changes targeting WSG July-2026 (Group Note Draft): canonical slug IDs, four unscored related checks, and `specVersion` in reports. These are not features of v0.1.2. See the [changelog](CHANGELOG.md) and [spec versioning policy](SPEC_VERSIONING.md).

Scores from different spec versions should not be treated as directly comparable. The package version and check selection also matter when comparing reports.

## Quick start

Requires Node.js 22 or later. Pin the released CLI for reproducible usage:

```bash
npx @sustainablewebsites/wsg-check@0.1.2 https://example.com

# Or install globally
npm install -g @sustainablewebsites/wsg-check@0.1.2
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
- Current CLI/API report page-weight and request-count metadata are zero placeholders because `RunResult` does not carry those metrics. They do not mean the page has no resources.
- In unreleased source, security headers, form validation, native form features, and image alternative text remain visible as **related checks**, excluded from WSG scores.

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

The table describes current source. In v0.1.2, `--guidelines` uses numeric IDs; slug IDs, related-check IDs, and the WSG suffix in `--version` are unreleased changes.

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
  uses: actions/upload-artifact@v7
  with:
    name: wsg-report
    path: wsg-report.json
```

### Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | Check completed and score is at or above `--fail-threshold` |
| `1`  | Fetch/parse error, or score is below `--fail-threshold`     |

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

The CLI and web API share a TypeScript fetch → check → score → report pipeline. The code is layered and framework-independent at its core, with direct dependencies on concrete utility implementations. The [architecture overview](docs/architecture.md) documents these boundaries and the external-I/O exceptions.

- [Documentation index](docs/README.md)
- [Architecture Decision Log (ADL)](docs/adl.md) and [ADR template](docs/adr/template.md)
- [Module and check reference](docs/reference.md)
- [WSG spec versioning](SPEC_VERSIONING.md)
- [Contributing](CONTRIBUTING.md), [releasing](RELEASING.md), and [changelog](CHANGELOG.md)
- [Executive summary](Executive-Summary.md) and [implementation plan](IMPLEMENTATION_PLAN.md) — historical planning context; use the architecture overview for implemented behavior

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE) and the [Contributor License Agreement](CLA.md).

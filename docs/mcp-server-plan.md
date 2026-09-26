# MCP Server Plan

[Documentation index](README.md) · [ADR-0009](adr/0009-local-mcp-server.md) · [Architecture](architecture.md)

Status: **Implemented** in phases 0–3. The first npm release with `wsg-check-mcp` is v0.4.0. Phase 4 lists later work. Setup instructions for users are in the [README](../README.md#use-with-ai-assistants-mcp).

## Goal

Ship a [Model Context Protocol](https://modelcontextprotocol.io) server that developers install from npm and run on their own machine. An AI assistant (Claude Code, Claude Desktop, VS Code/Copilot, Cursor, and other MCP clients) can then check a site against the WSG, including a local dev server, and get structured results with recommendations, without leaving the editor. This delivers the "MCP Server" item in Phase 4 of the [Executive Summary](../Executive-Summary.md).

## User experience

The server ships in the existing `@sustainablewebsites/wsg-check` package as a second bin, `wsg-check-mcp`. It speaks MCP over stdio, so it needs no port, daemon, or account.

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

Local dev servers (`http://localhost:3000` and other loopback addresses) work without extra configuration. To turn that off, add `--no-local` after `wsg-check-mcp` in the arguments. See [Network access policy](#network-access-policy).

Typical prompts: "Check http://localhost:3000 against the WSG and fix the top three issues", "Which WSG guidelines cover web fonts?", "Did my change improve the render-blocking score?"

## Current state that shapes the design

| Finding                                                                                                                                                                  | Consequence for the MCP server                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `defaultLogger` (`src/utils/logger.ts`) writes every `info`-level message to **stdout** with `console.log`, and `WsgChecker.check` logs at `info` (`src/core/index.ts`). | That output would corrupt the stdio JSON-RPC stream. It also pollutes `wsg-check -f json` today.      |
| The pipeline is framework-independent (ADR-0001): `WsgChecker`, the check arrays, `fromRunResult`, and the formatters have no Next.js or CLI dependency.                 | The MCP server is a thin adapter, like the CLI and API routes.                                        |
| Check selection is implemented twice: `selectChecks` in `src/cli/index.ts` (writes warnings to stderr) and `src/api/check-selection.ts` (pure).                          | Use one pure selector and return warnings as data.                                                    |
| The HTTP client (`src/utils/http-client.ts`) rejects redirect hops to loopback or private hosts. Only the API validates the initial URL (`src/api/validation.ts`).       | Checking `http://localhost:3000` works until the dev server redirects (e.g. `/` → `/en`), then fails. |
| `fromRunResult(runResult, 0, 0, 0)` is called with zeroed page-weight metrics in the CLI and API.                                                                        | The MCP report would carry the same zeros. Fix once at the shared layer rather than in each adapter.  |
| The guideline registry and pinned spec (`src/api/guidelines.ts`, `src/config/spec/`) are already exposed as pure functions.                                              | Guideline lookup tools and resources need no network access.                                          |
| tsup bundles only `src/cli/index.ts`. Runtime dependencies include `next`, `react`, and `react-dom`, which every `npx` install downloads.                                | Add a second tsup entry, and move web-only packages to `devDependencies` (Phase 0).                   |

## MCP surface (v1)

Use the official TypeScript SDK (`@modelcontextprotocol/sdk` 1.x, `McpServer` + `StdioServerTransport`) with `zod` input and output schemas. Every tool returns both `structuredContent` (validated by an `outputSchema`) and a Markdown `text` block for clients that ignore structured output.

### Tools

| Tool              | Input                                                                                                                                                     | Output                                                                                                                                                                                                  | Annotations                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `check_url`       | `url` (required); `categories?` (`ux`, `web-dev`, `hosting`); `guidelines?` (slugs or legacy IDs); `detail?` (`summary` default, or `full`); `timeoutMs?` | `summary`: score, grade, spec version, category scores, failed and warned checks with their recommendations, CO₂ estimate, warnings (e.g. deprecated IDs). `full`: the complete `SustainabilityReport`. | `readOnlyHint: true`, `openWorldHint: true` |
| `list_guidelines` | `category?`, `testability?` (`automated`, `semi-automated`, `manual-only`), `query?` (substring on title, slug, or description)                           | Guideline slugs, numbers, titles, categories, and testability, plus the spec release.                                                                                                                   | `readOnlyHint: true`                        |
| `get_guideline`   | `id` (slug or legacy numeric ID)                                                                                                                          | The registry entry (title, section, description, testability, W3C spec URL) and how many checks implement it.                                                                                           | `readOnlyHint: true`                        |

`summary` is the default because a full report lists ~35 checks with details and costs thousands of tokens. The assistant can ask for `full` when it needs evidence for a specific check.

Report progress with `notifications/progress` during `check_url` (fetching, running checks, scoring) when the client sends a progress token. Honour the request's abort signal so a cancelled check stops fetching.

Errors (unreachable host, parse failure, disallowed host) return `isError: true` with a plain explanation rather than a protocol error, so the assistant can react to them.

### Resources and prompts (v1.1)

- Resources: `wsg://spec` (release and provenance) and a `wsg://guidelines/{id}` template. These duplicate the guideline tools for clients that prefer resources.
- Prompt: `sustainability-review` with a `url` argument. It asks the assistant to run `check_url`, then map failed checks to files in the open workspace and propose fixes.

## Network access policy

Checking a dev server is the main local use case, so loopback access is on by default (maintainer decision). The server also fetches whatever URL an assistant passes, and that URL can come from untrusted page content (prompt injection). Allowing loopback by default therefore accepts a risk: an injected instruction could make the assistant check a service on the developer's machine and read back a summary of it. The policy limits that risk without adding setup steps:

| Target                                                    | Default | Change it with                                           |
| --------------------------------------------------------- | ------- | -------------------------------------------------------- |
| Public hosts                                              | Allowed | —                                                        |
| Loopback (`localhost`, `127.0.0.0/8`, `::1`)              | Allowed | `--no-local` or `WSG_CHECK_NO_LOCAL=1` blocks it         |
| Private LAN ranges (`10/8`, `172.16/12`, `192.168/16`)    | Blocked | `--allow-private-network` or `WSG_CHECK_ALLOW_PRIVATE=1` |
| Link-local and cloud metadata (`169.254/16`, `fe80::/10`) | Blocked | Never allowed                                            |
| Non-HTTP schemes                                          | Blocked | Never allowed                                            |

Mitigations that stay on regardless of flags:

- **No redirects into loopback.** A redirect from a non-loopback host to a loopback host is refused, so checking a public URL can never land on a local service. Redirects within loopback (for example `/` → `/en` on a dev server) are allowed.
- **Configuration only.** Flags are set in the client's server configuration, which the user edits, never through a tool argument the assistant controls.
- **Visible targets.** `check_url` results always state the final URL fetched, so a local check is obvious in the transcript and in the client's tool-approval prompt.

Apply the policy to the initial URL and to every redirect hop. Implement it as a `hostPolicy` option on `HttpClient` and `PageFetcher`, with today's behaviour as the default, so the CLI and API keep their current rules.

The server makes no other outbound calls beyond those the checks already make (the Green Web Foundation hosting lookup). Document that lookup in the README so users know a check sends the hostname to a third party.

## Implementation phases

Each phase is a separate PR that passes lint, type-check, unit tests, and both builds.

### Phase 0 — Prerequisites in shared code

- [x] Send all logger output to **stderr** (`console.error`), or make the stream configurable. Add a test that runs `check` and asserts nothing is written to stdout. This also fixes `wsg-check -f json` output.
- [x] Move check selection into one pure module that returns the checks and notices. Make the CLI and API use it and delete the CLI copy. Implemented as `src/pipeline/selection.ts` (`{ checks, notices }`).
- [x] Add a shared `runReport(url, options)` function that runs `WsgChecker` and builds the `SustainabilityReport` with real page-weight metrics. The CLI, API route, and MCP server all call it. Implemented in `src/pipeline/run-report.ts`; callers pass checks from `selectChecks` so they can show notices before the run starts.
- [x] Add the `hostPolicy` option to `HttpClient` and `PageFetcher`, checked on the initial URL and on each redirect hop. Implemented in `src/utils/host-policy.ts`.
- [x] Move web-only packages from `dependencies` to `devDependencies`: `next`, `react`, `react-dom`, `@ark-ui/react`, and `rate-limiter-flexible` (only `src/app/` and `src/api/` import them). The Netlify and CI builds install dev dependencies, so the web app is unaffected, while `npx` installs of the CLI and MCP server skip them.
- [x] Guard that move: add an ESLint `no-restricted-imports` rule so `src/cli/`, `src/mcp/`, `src/core/`, `src/checks/`, `src/report/`, `src/config/`, and `src/utils/` cannot import `next`, React, or the Next-dependent `src/api/` modules (`cors.ts`, `rate-limit.ts`, `response.ts`). Otherwise tsup would silently bundle Next.js into the CLI. Add a CI step that installs the packed tarball with `--omit=dev` and runs `wsg-check --version`.

### Phase 1 — Server and `check_url`

- [x] Add `@modelcontextprotocol/sdk` and `zod` as dependencies.
- [x] Create `src/mcp/server.ts` (`createServer(options)` registers tools; no I/O) and `src/mcp/index.ts` (parses flags, connects `StdioServerTransport`, handles `SIGINT`/`SIGTERM`).
- [x] Implement `check_url` with the summary and full projections, progress notifications, cancellation, and a per-call timeout.
- [x] Add `src/mcp/index.ts` as a second tsup entry emitting `dist/mcp/index.js` with the shebang banner. Add `"wsg-check-mcp": "./dist/mcp/index.js"` to `bin`.
- [x] Unit tests: call the tools through the SDK's in-memory transport (`InMemoryTransport.createLinkedPair()`) with `WsgChecker` fetching a mocked page. Assert the outputs validate against the declared schemas.
- [x] Skip the green-hosting lookup for local hosts (the Phase 0 follow-up); the hosting check reports them as not-applicable.

### Phase 2 — Guideline tools

- [x] Implement `list_guidelines` and `get_guideline` on top of `src/api/guidelines.ts` and the registry (`src/mcp/guidelines.ts`). Instead of check IDs, which are internal, each guideline reports how many `check_url` checks implement it, and `get_guideline` lists the deprecated numeric IDs that resolve to it.
- [x] Unit tests for filters, legacy-ID lookup, and an unknown ID (`tests/unit/mcp/guidelines.test.ts`). They also cover numeric IDs whose guideline was removed and related-check IDs. The stdio smoke test now expects all three tools.

### Phase 3 — Packaging, CI, and docs

- [x] CI smoke test: build, then spawn `node dist/mcp/index.js`, send `initialize` and `tools/list` over stdio, and assert every stdout line parses as JSON-RPC. Done in Phase 1: `tests/smoke/mcp-stdio.mjs`, run by the npm package smoke test against the installed tarball.
- [x] Run the MCP Inspector against the built server and document the commands in CONTRIBUTING.md. Its CLI mode (`--cli`) listed all three tools and called `get_guideline` and `check_url` (against a local page) successfully.
- [x] README: a "Use with AI assistants (MCP)" section with the Claude Code, Claude Desktop, VS Code, and Cursor snippets above, the tool list, the network policy, and the Green Web Foundation lookup.
- [x] Document the loopback tradeoff: a prompt-injected call can make GET requests to services on the developer's machine. The README should recommend `--no-local` for anyone who doesn't check a local dev server. The `check_url` description should tell the assistant that local URLs are fetched from the user's machine. This is the residual risk accepted for the SonarCloud S5144 (SSRF) findings on the HTTP client.
- [x] Update `docs/architecture.md` (new adapter) and `docs/reference.md` (tools), and move ADR-0009 to Accepted. release-please writes the CHANGELOG from the conventional commits.
- [x] Release through the existing release-please and Trusted Publishing flow, with no workflow changes. v0.3.0 was tagged but deliberately not published; v0.4.0 is the first npm release with the server. A clean `npm install` of 0.4.0 passed the stdio smoke test, and an MCP client ran `check_url` and `list_guidelines` against it.

### Phase 4 — After the first release

- [ ] Resources and the `sustainability-review` prompt.
- [ ] A `compare` option or tool that re-checks a URL and reports score changes since the last run in the same session.
- [ ] Submit to the official MCP Registry (`server.json`) and add an MCPB bundle for one-click Claude Desktop install.
- [ ] A remote Streamable HTTP endpoint on the Netlify deployment, reusing the API's rate limiting and SSRF validation. Out of scope for the local server.

## Decisions

Recorded from maintainer answers on 2026-09-25:

1. **Distribution:** a second bin, `wsg-check-mcp`, in the existing `@sustainablewebsites/wsg-check` package. Not a subcommand (it would clash with the CLI's positional `<url>`) and not a separate package.
2. **Package weight:** move web-only packages to `devDependencies` so `npx` installs are much smaller. Scheduled in Phase 0.
3. **Loopback access:** allowed by default, with the mitigations in [Network access policy](#network-access-policy).

## Open questions

1. **Per-call confirmation?** Clients that support MCP elicitation could ask the user to approve each loopback URL before it is fetched. Support varies by client, so v1 relies on the client's tool-approval prompt and treats elicitation as a later addition.

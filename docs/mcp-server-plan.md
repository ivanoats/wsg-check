# MCP Server Plan

[Documentation index](README.md) · [ADR-0009](adr/0009-local-mcp-server.md) · [Architecture](architecture.md)

Status: **Proposed**. Nothing described here is implemented yet.

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

To check a local dev server, add `--allow-origin http://localhost:3000` (or `--allow-local` for any loopback port) after `wsg-check-mcp` in the arguments. See [Network access policy](#network-access-policy).

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
| tsup bundles only `src/cli/index.ts`. Runtime dependencies include `next`, `react`, and `react-dom`, which every `npx` install downloads.                                | Add a second tsup entry. Package size is a separate follow-up (see below), not a blocker.             |

## MCP surface (v1)

Use the official TypeScript SDK (`@modelcontextprotocol/sdk` 1.x, `McpServer` + `StdioServerTransport`) with `zod` input and output schemas. Every tool returns both `structuredContent` (validated by an `outputSchema`) and a Markdown `text` block for clients that ignore structured output.

### Tools

| Tool              | Input                                                                                                                                                     | Output                                                                                                                                                                                                  | Annotations                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `check_url`       | `url` (required); `categories?` (`ux`, `web-dev`, `hosting`); `guidelines?` (slugs or legacy IDs); `detail?` (`summary` default, or `full`); `timeoutMs?` | `summary`: score, grade, spec version, category scores, failed and warned checks with their recommendations, CO₂ estimate, warnings (e.g. deprecated IDs). `full`: the complete `SustainabilityReport`. | `readOnlyHint: true`, `openWorldHint: true` |
| `list_guidelines` | `category?`, `testability?` (`automated`, `semi-automated`, `manual-only`), `query?` (substring on title)                                                 | Guideline slugs, numbers, titles, categories, and testability, plus the spec release.                                                                                                                   | `readOnlyHint: true`                        |
| `get_guideline`   | `id` (slug or legacy numeric ID)                                                                                                                          | The registry entry (title, section, description, testability, W3C spec URL) and the IDs of the checks that implement it.                                                                                | `readOnlyHint: true`                        |

`summary` is the default because a full report lists ~35 checks with details and costs thousands of tokens. The assistant can ask for `full` when it needs evidence for a specific check.

Report progress with `notifications/progress` during `check_url` (fetching, running checks, scoring) when the client sends a progress token. Honour the request's abort signal so a cancelled check stops fetching.

Errors (unreachable host, parse failure, disallowed host) return `isError: true` with a plain explanation rather than a protocol error, so the assistant can react to them.

### Resources and prompts (v1.1)

- Resources: `wsg://spec` (release and provenance) and a `wsg://guidelines/{id}` template. These duplicate the guideline tools for clients that prefer resources.
- Prompt: `sustainability-review` with a `url` argument. It asks the assistant to run `check_url`, then map failed checks to files in the open workspace and propose fixes.

## Network access policy

Checking a dev server is the main local use case, so the MCP server needs a way to reach loopback addresses. It also fetches whatever URL an assistant passes, and that URL can come from untrusted page content (prompt injection). If loopback access were on by default, an injected page could make the server probe developer-local services. Local access is therefore opt-in, and the narrowest option is the one the docs recommend:

| Target                                                    | Default | Opt-in                                                                                                                |
| --------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| Public hosts                                              | Allowed | —                                                                                                                     |
| Specific local origins (e.g. `http://localhost:3000`)     | Blocked | `--allow-origin <origin>` (repeatable) or `WSG_CHECK_ALLOW_ORIGINS` (comma-separated). Recommended in setup snippets. |
| Any loopback port (`localhost`, `127.0.0.0/8`, `::1`)     | Blocked | `--allow-local` or `WSG_CHECK_ALLOW_LOCAL=1`                                                                          |
| Private LAN ranges (`10/8`, `172.16/12`, `192.168/16`)    | Blocked | `--allow-private-network` or `WSG_CHECK_ALLOW_PRIVATE=1`                                                              |
| Link-local and cloud metadata (`169.254/16`, `fe80::/10`) | Blocked | Never                                                                                                                 |
| Non-HTTP schemes                                          | Blocked | Never                                                                                                                 |

Opt-in happens in the client's server configuration, which the user edits, never through a tool argument the assistant controls. When `check_url` refuses a local URL, the error names the flag to add, so the assistant can tell the user how to enable it rather than retrying.

Apply the policy to the initial URL and to every redirect hop, so an allowed origin cannot redirect to one that is not allowed. Implement it as a `hostPolicy` option on `HttpClient` and `PageFetcher`, with today's behaviour as the default, so the CLI and API keep their current rules.

The server makes no other outbound calls beyond those the checks already make (the Green Web Foundation hosting lookup). Document that lookup in the README so users know a check sends the hostname to a third party.

## Implementation phases

Each phase is a separate PR that passes lint, type-check, unit tests, and both builds.

### Phase 0 — Prerequisites in shared code

- [ ] Send all logger output to **stderr** (`console.error`), or make the stream configurable. Add a test that runs `check` and asserts nothing is written to stdout. This also fixes `wsg-check -f json` output.
- [ ] Move check selection into one pure module (for example `src/core/selection.ts`) that returns `{ checks, warnings }`. Make the CLI and API use it and delete the CLI copy.
- [ ] Add a shared `runReport(url, options)` function that selects checks, runs `WsgChecker`, and builds the `SustainabilityReport` with real page-weight metrics. The CLI, API route, and MCP server all call it.
- [ ] Add the `hostPolicy` option to `HttpClient` and `PageFetcher`, checked on the initial URL and on each redirect hop.

### Phase 1 — Server and `check_url`

- [ ] Add `@modelcontextprotocol/sdk` and `zod` as dependencies.
- [ ] Create `src/mcp/server.ts` (`createServer(options)` registers tools; no I/O) and `src/mcp/index.ts` (parses flags, connects `StdioServerTransport`, handles `SIGINT`/`SIGTERM`).
- [ ] Implement `check_url` with the summary and full projections, progress notifications, cancellation, and a per-call timeout.
- [ ] Add `src/mcp/index.ts` as a second tsup entry emitting `dist/mcp/index.js` with the shebang banner. Add `"wsg-check-mcp": "./dist/mcp/index.js"` to `bin`.
- [ ] Unit tests: call the tools through the SDK's in-memory transport (`InMemoryTransport.createLinkedPair()`) with `WsgChecker` fetching a mocked page. Assert the outputs validate against the declared schemas.

### Phase 2 — Guideline tools

- [ ] Implement `list_guidelines` and `get_guideline` on top of `src/api/guidelines.ts` and the registry.
- [ ] Unit tests for filters, legacy-ID lookup, and an unknown ID.

### Phase 3 — Packaging, CI, and docs

- [ ] CI smoke test: build, then spawn `node dist/mcp/index.js`, send `initialize` and `tools/list` over stdio, and assert every stdout line parses as JSON-RPC.
- [ ] Run the MCP Inspector (`npx @modelcontextprotocol/inspector node dist/mcp/index.js`) manually before the first release, and document the command in CONTRIBUTING.md.
- [ ] README: an "Use with AI assistants" section with the Claude Code, Claude Desktop, VS Code, and Cursor snippets above, the tool list, and the network policy.
- [ ] Update `docs/architecture.md` (new adapter), `docs/reference.md` (tools), the CHANGELOG, and move ADR-0009 to Accepted.
- [ ] Release through the existing release-please and Trusted Publishing flow; no workflow changes are expected.

### Phase 4 — After the first release

- [ ] Resources and the `sustainability-review` prompt.
- [ ] A `compare` option or tool that re-checks a URL and reports score changes since the last run in the same session.
- [ ] Submit to the official MCP Registry (`server.json`) and add an MCPB bundle for one-click Claude Desktop install.
- [ ] A remote Streamable HTTP endpoint on the Netlify deployment, reusing the API's rate limiting and SSRF validation. Out of scope for the local server.

## Open questions

1. **Separate bin or subcommand?** The plan uses a second bin, `wsg-check-mcp`, because the CLI's default command takes a positional `<url>`, and `wsg-check mcp` would be ambiguous with a URL argument. The cost is the longer `npx -p … wsg-check-mcp` form. A separate `@sustainablewebsites/wsg-check-mcp` package would give `npx -y @sustainablewebsites/wsg-check-mcp` but adds a second release to maintain.
2. **Package weight.** `next`, `react`, and `react-dom` are runtime dependencies, so every `npx` launch downloads them. Moving them to `devDependencies` (the web app builds from the repo, not the npm package) would make CLI and MCP installs much smaller. That is worth a separate change, since it also affects the CLI.
3. **Per-call confirmation?** Clients that support MCP elicitation could ask the user to approve each local URL instead of relying on a startup allowlist. Support varies by client, so v1 uses the allowlist and treats elicitation as a later addition.

# ADR-0009: Ship a local stdio MCP server in the npm package

- Status: Proposed
- Decision date: 2026-09-25 (proposal)
- Recorded: 2026-09-25
- Provenance: contemporaneous decision
- Supersedes: none
- Superseded by: none
- Availability: unreleased

[Decision log](../adl.md) · [MCP server plan](../mcp-server-plan.md)

## Context

The Executive Summary's AI-integration phase calls for wsg-check to be usable from AI assistants through the Model Context Protocol. Developers want to check sites, including local dev servers, from their editor's assistant. The analysis pipeline is already framework-independent (ADR-0001), and the CLI is published to npm separately from the web app (ADR-0008).

## Decision

Add a third adapter, `src/mcp/`, built with the official TypeScript MCP SDK over the stdio transport. Publish it in the existing `@sustainablewebsites/wsg-check` package as a second bin, `wsg-check-mcp`, built by a second tsup entry. v1 exposes the `check_url`, `list_guidelines`, and `get_guideline` tools. Loopback targets are allowed by default so dev servers work without setup; `--no-local` turns them off. Redirects from non-loopback hosts into loopback are always refused. Private-network targets need `--allow-private-network`, and link-local and metadata addresses are always blocked. Web-only packages (`next`, React, `@ark-ui/react`, `rate-limiter-flexible`) move to `devDependencies` so `npx` installs stay small.

Before the adapter is added, move shared behaviour out of the CLI: logging to stderr, one pure check selector, and one report-building function.

## Consequences

- Developers can run the server with `npx` and no account, port, or hosted service.
- The package gains `@modelcontextprotocol/sdk` and `zod` as runtime dependencies.
- Anything that writes to stdout in the shared pipeline breaks the protocol, so a CI smoke test must guard stdout.
- The HTTP client gains a configurable host policy. The CLI and API keep their current behaviour.
- Default loopback access accepts a prompt-injection risk: an injected instruction could have the assistant check a local service. Blocking redirects into loopback, keeping flags out of tool arguments, and showing the fetched URL limit that risk; they do not remove it.
- Installing the npm package no longer brings Next.js or React. Lint rules and a packed-install CI step must keep them out of the CLI and MCP bundles.
- A remote (Streamable HTTP) server remains possible later but is not part of this decision.

## Alternatives and evidence limits

- **Separate npm package**: shorter `npx` command, but a second package to version and release. Rejected by the maintainer.
- **`wsg-check mcp` subcommand**: conflicts with the CLI's positional `<url>` argument.
- **Loopback opt-in (`--allow-origin` / `--allow-local`)**: proposed after an automated review flagged the prompt-injection risk. The maintainer chose default access instead, to avoid extra setup for the main use case, and kept the mitigations above.
- **Hosted HTTP server only**: cannot reach a developer's localhost and adds operating cost; deferred to a later phase.

## Evidence

- [MCP server plan](../mcp-server-plan.md)
- [Executive Summary, Phase 4](../../Executive-Summary.md)
- [ADR-0001](0001-shared-analysis-pipeline.md), [ADR-0008](0008-cli-distribution.md)

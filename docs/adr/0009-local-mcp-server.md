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

Add a third adapter, `src/mcp/`, built with the official TypeScript MCP SDK over the stdio transport. Publish it in the existing `@sustainablewebsites/wsg-check` package as a second bin, `wsg-check-mcp`, built by a second tsup entry. v1 exposes the `check_url`, `list_guidelines`, and `get_guideline` tools. Local and private-network targets are blocked unless the user opts in through the server's startup configuration (`--allow-origin` for specific local origins, `--allow-local` for any loopback port, `--allow-private-network`). Link-local and metadata addresses are always blocked. Tool URLs can come from untrusted page content, so default loopback access would let a prompt-injected page probe developer-local services.

Before the adapter is added, move shared behaviour out of the CLI: logging to stderr, one pure check selector, and one report-building function.

## Consequences

- Developers can run the server with `npx` and no account, port, or hosted service.
- The package gains `@modelcontextprotocol/sdk` and `zod` as runtime dependencies.
- Anything that writes to stdout in the shared pipeline breaks the protocol, so a CI smoke test must guard stdout.
- The HTTP client gains a configurable host policy. The CLI and API keep their current behaviour.
- Checking a dev server needs one extra argument in the client configuration, which the setup docs show.
- A remote (Streamable HTTP) server remains possible later but is not part of this decision.

## Alternatives and evidence limits

- **Separate npm package**: shorter `npx` command, but a second package to version and release. Kept as an open question in the plan.
- **`wsg-check mcp` subcommand**: conflicts with the CLI's positional `<url>` argument.
- **Loopback allowed by default**: simpler setup for the main use case, but opens a prompt-injection path to local services; rejected after review.
- **Hosted HTTP server only**: cannot reach a developer's localhost and adds operating cost; deferred to a later phase.

## Evidence

- [MCP server plan](../mcp-server-plan.md)
- [Executive Summary, Phase 4](../../Executive-Summary.md)
- [ADR-0001](0001-shared-analysis-pipeline.md), [ADR-0008](0008-cli-distribution.md)

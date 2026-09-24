# ADR-0008: Build and publish the CLI separately from the web app

- Status: Accepted
- Historical implementation date: 2026-04-21 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

The shared checker needs command-line distribution without requiring users to run the Next.js application. Later release changes scoped the package and automated npm publication.

## Decision

Build `src/cli/index.ts` with tsup into a Node 22 ESM entry point at `dist/cli/index.js`, exposed as `wsg-check`. Publish the scoped npm package separately from the Next.js build. The current publishing flow uses npm Trusted Publishing (OIDC) and provenance; release-please manages release proposals.

## Consequences

The CLI can run independently of the web server, while both share source modules. CLI and web builds must be validated separately when code changes. Publishing has its own runtime/tooling requirements and manual-dispatch fallback; keep operational steps in RELEASING.md.

## Alternatives and evidence limits

No formal bundler comparison was found in the packaging change. OIDC replaced the earlier token-based publishing setup in the cited follow-up; do not infer that all packaging decisions were made at once.

## Evidence

- [Add separate CLI build and npm publishing (115b5f3)](https://github.com/ivanoats/wsg-check/commit/115b5f3)
- [Scope the npm package (56e77e3)](https://github.com/ivanoats/wsg-check/commit/56e77e3)
- [Use Trusted Publishing (70eebf8)](https://github.com/ivanoats/wsg-check/commit/70eebf8)
- [Publishing runtime and dispatch support (aa247c3)](https://github.com/ivanoats/wsg-check/commit/aa247c3)
- [Automate release proposals (a823bf8)](https://github.com/ivanoats/wsg-check/commit/a823bf8)

Current implementation/reference:

- [tsup.config.ts](../../tsup.config.ts)
- [package.json](../../package.json)
- [.github/workflows/publish.yml](../../.github/workflows/publish.yml)
- [RELEASING.md](../../RELEASING.md)

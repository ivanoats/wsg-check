# ADR-0001: Share a framework-independent analysis pipeline

- Status: Accepted
- Historical implementation date: 2026-02-20 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

The CLI and web adapters need the same fetch, check, and scoring behavior. The core-module change established shared types and orchestration before those adapters were completed.

## Decision

Use `WsgChecker`, `PageFetcher`, `CheckRunner`, and a pure scorer as the shared pipeline. Run registered checks with `Promise.allSettled` and represent fetch/parse failures with a typed `Result`.

## Consequences

The source demonstrates reuse and per-check failure isolation. The historical hexagonal description is an intent, not proof of dependency inversion: the core constructs concrete utility implementations. Changing HTTP implementations still requires editing or refactoring that wiring.

## Alternatives and evidence limits

No explicit alternatives comparison was found in the cited core change. A separate implementation per adapter is a retrospective comparison, not a recorded rejected proposal.

## Evidence

- [Core pipeline and architecture documentation (7719307)](https://github.com/ivanoats/wsg-check/commit/7719307)

Current implementation/reference:

- [src/core/index.ts](../../src/core/index.ts)
- [src/core/fetcher.ts](../../src/core/fetcher.ts)
- [src/core/runner.ts](../../src/core/runner.ts)
- [src/core/scorer.ts](../../src/core/scorer.ts)

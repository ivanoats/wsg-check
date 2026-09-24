# ADR-0006: Keep unmatched checks visible but outside WSG scores

- Status: Accepted
- Historical implementation date: 2026-09-24 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

Four existing checks have no matching guideline in the pinned July-2026 release. Keeping them in WSG scoring would imply coverage of guidelines that are not present.

## Decision

Retain security headers, form validation, native form features, and image alternative text as related checks. Use dedicated IDs and `related: true`; exclude them from category/overall scores and WSG summary counts. Keep a separate related-check count and section. Prioritize WSG recommendations before related recommendations.

## Consequences

The checks remain useful and selectable, including when they fail, but reports and scores change. Registered wrappers must preserve identity and related status even when a check throws. Consumers must handle slug guideline IDs and `summary.relatedChecks`.

## Alternatives and evidence limits

SPEC_VERSIONING.md explicitly records three options: drop these checks, retain them as unscored related checks, or re-home them under partially overlapping criteria. The implemented choice is unscored related checks.

## Evidence

- [Implement related checks and normalized reported identities (8b9a372)](https://github.com/ivanoats/wsg-check/commit/8b9a372)

Current implementation/reference:

- [src/checks/index.ts](../../src/checks/index.ts)
- [src/core/scorer.ts](../../src/core/scorer.ts)
- [src/report/types.ts](../../src/report/types.ts)
- [src/report/recommendations.ts](../../src/report/recommendations.ts)
- [SPEC_VERSIONING.md](../../SPEC_VERSIONING.md)

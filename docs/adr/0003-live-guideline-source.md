# ADR-0003: Read live W3C guideline data with a static fallback

- Status: Superseded by ADR-0005
- Historical implementation date: 2026-02-22 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

The project initially had a hand-maintained guideline registry. The W3C JSON API integration introduced an authoritative upstream source with fallback behavior.

## Decision

Fetch W3C guideline JSON and map it into application entries, using a static registry when the live source cannot be used. This records historical behavior, not the current runtime.

## Consequences

A successful upstream schema change could silently invalidate numeric identity and testability mappings. The September compatibility fix rejected non-numeric IDs, before the live client was removed entirely by ADR-0005.

## Alternatives and evidence limits

The static registry was the implemented fallback. Pinning a tagged snapshot became the documented successor after schema drift; it is not asserted to have been debated in February.

## Evidence

- [Introduce authoritative live WSG source (1039080)](https://github.com/ivanoats/wsg-check/commit/1039080)
- [Reject changed schema and document migration (48ec49a)](https://github.com/ivanoats/wsg-check/commit/48ec49a)
- [Replace live client with pinned snapshot (e0350ad)](https://github.com/ivanoats/wsg-check/commit/e0350ad)

Current implementation/reference:

- [SPEC_VERSIONING.md](../../SPEC_VERSIONING.md)

Successor: [ADR-0005](0005-pin-wsg-spec.md). The removed live-client implementation is available in the historical commits above.

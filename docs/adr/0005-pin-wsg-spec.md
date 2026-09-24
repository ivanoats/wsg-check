# ADR-0005: Pin WSG releases and use canonical slug identities

- Status: Accepted; supersedes ADR-0003
- Historical implementation date: 2026-09-24 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

The upstream July-2026 JSON schema replaced numeric IDs with slugs, and prior local registry/check numbering disagreed. Live data could change meanings without an application release.

## Decision

Vendor the July-2026 tagged JSON with tag and commit provenance. Build the registry from it, keyed by upstream slugs, and derive positional numbers for display. Remove live guideline fetching. Keep check-based legacy numeric aliases and CLI deprecation warnings; validate mappings with tests.

## Consequences

The guideline dataset is reproducible and changes require a reviewed application update. Legacy numeric selection is compatibility behavior, not July-2026 positional lookup: shared old IDs can select more than one check. Slug IDs in results change the output contract. Future upstream slugs may also change, so the pinned release remains part of the identity context.

## Alternatives and evidence limits

This supersedes live fetching plus fallback (ADR-0003). The temporary schema rejection fix was a stopgap. SPEC_VERSIONING.md records the rationale for tagged snapshots rather than moving upstream data.

## Evidence

- [Schema failure analysis and versioning proposal (48ec49a)](https://github.com/ivanoats/wsg-check/commit/48ec49a)
- [Implement pinned spec and canonical slugs (e0350ad)](https://github.com/ivanoats/wsg-check/commit/e0350ad)

Current implementation/reference:

- [src/config/spec/index.ts](../../src/config/spec/index.ts)
- [src/config/guidelines-registry.ts](../../src/config/guidelines-registry.ts)
- [src/checks/index.ts](../../src/checks/index.ts)
- [SPEC_VERSIONING.md](../../SPEC_VERSIONING.md)

Supersedes [ADR-0003](0003-live-guideline-source.md).

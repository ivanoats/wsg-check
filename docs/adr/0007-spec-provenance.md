# ADR-0007: Report spec provenance independently of package versions

- Status: Accepted
- Historical implementation date: 2026-09-24 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

Persisted reports need to identify their ruleset. Package releases also contain dependency, code, and tooling changes unrelated to the WSG release.

## Decision

Use `WSG_SPEC` as the spec provenance source. Add `specVersion` to reports and health responses, and show it in CLI version output. Keep npm semver independent. While pre-1.0, breaking spec/contract changes use a minor bump; after 1.0 they require a major bump. Watch upstream tags by opening review issues, without automatically updating the snapshot.

## Consequences

Consumers can distinguish spec baselines, but matching `specVersion` alone does not guarantee identical scoring across package versions or check selections. Reports carry the release tag; the full upstream commit remains in spec provenance. Maintainers must review new tags and update the tracked-tag list.

## Alternatives and evidence limits

The versioning policy explicitly avoids encoding the spec as npm semver build metadata because npm ignores that metadata and release-please does not manage it.

## Evidence

- [Report spec version and add upstream tag watcher (aad2848)](https://github.com/ivanoats/wsg-check/commit/aad2848)
- [Configure pre-1.0 breaking-change minor bumps (fb9ee7e)](https://github.com/ivanoats/wsg-check/commit/fb9ee7e)

Current implementation/reference:

- [src/config/spec/index.ts](../../src/config/spec/index.ts)
- [src/report/types.ts](../../src/report/types.ts)
- [release-please-config.json](../../release-please-config.json)
- [.github/workflows/wsg-spec-watch.yml](../../.github/workflows/wsg-spec-watch.yml)
- [SPEC_VERSIONING.md](../../SPEC_VERSIONING.md)

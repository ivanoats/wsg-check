# ADR-0002: Use static page analysis and modeled carbon estimates

- Status: Accepted
- Historical implementation date: 2026-02-21 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

The utility and core implementation inspect HTTP responses and parsed HTML. Carbon estimation was added to that existing pipeline.

## Decision

Use Axios/Cheerio data and resource references for static checks. Estimate CO₂ from HTML byte size using CO2.js SWD v4 and a Green Web Foundation hosting lookup. Continue the run when the hosting lookup fails, returning false.

## Consequences

The implementation does not require a browser-rendering engine for analysis. It cannot measure JavaScript-rendered content, full resource transfer, or live Core Web Vitals. The boolean hosting interface conflates lookup failures with non-green results. The hosting check is an I/O exception to otherwise static checks.

## Alternatives and evidence limits

Browser-based measurement is a complementary approach identified by report methodology. No historical benchmark or formal rejection of a browser engine was found; lower runtime overhead is an inference from the implementation.

## Evidence

- [HTTP, HTML and resource utilities (1c1c1cc)](https://github.com/ivanoats/wsg-check/commit/1c1c1cc)
- [CO2.js integration (ff47db9)](https://github.com/ivanoats/wsg-check/commit/ff47db9)
- [Repair callable CO2.js ESM hosting integration (7e42ac5)](https://github.com/ivanoats/wsg-check/commit/7e42ac5)

Current implementation/reference:

- [src/utils/carbon-estimator.ts](../../src/utils/carbon-estimator.ts)
- [src/core/index.ts](../../src/core/index.ts)
- [src/report/types.ts](../../src/report/types.ts)

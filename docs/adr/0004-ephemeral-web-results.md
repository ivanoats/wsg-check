# ADR-0004: Carry reports through browser session storage

- Status: Accepted
- Historical implementation date: 2026-02-24 (commit date; not a claimed approval date)
- Recorded: 2026-09-24
- Provenance: retrospectively reconstructed from the evidence below

[Decision log](../adl.md) · [Architecture](../architecture.md)

## Context

The API introduced an in-memory result store. On serverless deployments, POST and subsequent GET requests can reach different instances, producing a 404 on the results page. The fix commit explicitly records this failure.

## Decision

Save the completed POST response in browser `sessionStorage` and read it first on the results page. Retain the GET endpoint as a fallback. Continue using process-local result storage and rate limiting.

## Consequences

The submitting browser can display its report without reaching the instance that created it. This is not durable persistence: new browser sessions, unavailable session storage, restarts, eviction, or another server instance can make retrieval fail. Current store bounds are one hour and 500 results; rate limits are not distributed.

## Alternatives and evidence limits

The previous GET-first flow is the documented replaced behavior. A shared database or cache would address durable cross-instance retrieval, but no formal rejection of that option was found in this fix.

## Evidence

- [API and in-memory infrastructure (95bb5df)](https://github.com/ivanoats/wsg-check/commit/95bb5df)
- [Fix serverless result 404 with sessionStorage (a51721c)](https://github.com/ivanoats/wsg-check/commit/a51721c)

Current implementation/reference:

- [src/api/store.ts](../../src/api/store.ts)
- [src/api/rate-limit.ts](../../src/api/rate-limit.ts)
- [src/app/components/UrlInputForm.tsx](../../src/app/components/UrlInputForm.tsx)
- [src/app/results/[id]/ResultsClient.tsx](../../src/app/results/[id]/ResultsClient.tsx)

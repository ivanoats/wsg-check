# Architecture Decision Log (ADL)

[Documentation index](README.md) · [Current architecture](architecture.md)

This log indexes Architecture Decision Records (ADRs). It was backfilled on 2026-09-24 from repository commits and current source. **Accepted** means implemented and still in use; it does not claim a historical approval meeting or approver. Dates below are implementation commit dates, not release dates. Where intent was not recorded, ADRs label inference and avoid inventing rejected alternatives.

Records cover the main architectural choices evidenced by the inspected history, not every dependency or design choice. September spec decisions are implemented on `main` but unreleased since v0.1.2. ADR numbering follows this log's backfill grouping, not strict historical chronology.

| ADR  | Decision                                                                                        | Implementation date | Status                        |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------- | ----------------------------- |
| 0001 | [Share a framework-independent analysis pipeline](adr/0001-shared-analysis-pipeline.md)         | 2026-02-20          | Accepted                      |
| 0002 | [Use static page analysis and modeled carbon estimates](adr/0002-static-analysis-and-carbon.md) | 2026-02-21          | Accepted                      |
| 0003 | [Read live W3C guideline data with a static fallback](adr/0003-live-guideline-source.md)        | 2026-02-22          | Superseded by ADR-0005        |
| 0004 | [Carry reports through browser session storage](adr/0004-ephemeral-web-results.md)              | 2026-02-25          | Accepted                      |
| 0005 | [Pin WSG releases and use canonical slug identities](adr/0005-pin-wsg-spec.md)                  | 2026-09-24          | Accepted; supersedes ADR-0003 |
| 0006 | [Keep unmatched checks visible but outside WSG scores](adr/0006-related-checks.md)              | 2026-09-24          | Accepted                      |
| 0007 | [Report spec provenance independently of package versions](adr/0007-spec-provenance.md)         | 2026-09-24          | Accepted                      |
| 0008 | [Build and publish the CLI separately from the web app](adr/0008-cli-distribution.md)           | 2026-04-20          | Accepted                      |
| 0009 | [Ship a local stdio MCP server in the npm package](adr/0009-local-mcp-server.md)                | 2026-09-25          | Proposed                      |

## Maintaining the records

1. Copy the [template](adr/template.md) into `docs/adr/NNNN-short-title.md` using the next unused number, and add a row here.
2. Record a significant boundary, contract, dependency strategy, persistence, deployment, or scoring choice. Routine implementation changes do not need an ADR.
3. Use **Proposed**, **Accepted**, **Rejected**, **Deprecated**, or **Superseded by ADR-NNNN**. An ADR may be accepted before release; track release availability separately.
4. Link the supporting PR/commit and implementation. Record alternatives only when supported by discussion; label retrospective analysis explicitly. Identify the decision date and record date separately when backfilling.
5. When a decision changes, add a successor ADR and update both records' status/links and this log. Preserve the old context instead of rewriting history.
6. Update the architecture overview, affected reference material, README release notes, and changelog in the same change.

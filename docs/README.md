# Documentation

Start with the [project README](../README.md) for installation and usage.

| Document                                                                     | Purpose                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Architecture](architecture.md)                                              | Current components, data flow, boundaries, and operational limitations       |
| [Architecture Decision Log (ADL)](adl.md)                                    | Ordered index of decisions and their status                                  |
| [Architecture Decision Records (ADRs)](adr/0001-shared-analysis-pipeline.md) | Individual records explaining context, decisions, consequences, and evidence |
| [Module and check reference](reference.md)                                   | Detailed checks, utilities, and report behavior                              |
| [MCP server plan](mcp-server-plan.md)                                        | Proposed local MCP server for AI assistants                                  |
| [Spec versioning](../SPEC_VERSIONING.md)                                     | WSG migration details and version policy                                     |
| [Contributing](../CONTRIBUTING.md)                                           | Development setup and validation                                             |
| [Releasing](../RELEASING.md)                                                 | Maintainer release procedure                                                 |
| [Changelog](../CHANGELOG.md)                                                 | Released and unreleased changes                                              |

Architecture describes what is implemented. ADRs explain why it changed. The changelog describes what users receive in each release. Keep all three aligned when making a significant change; use the [ADR template](adr/template.md) and process in the [ADL](adl.md).

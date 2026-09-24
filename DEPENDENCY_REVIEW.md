# Dependency PR review — September 23, 2026

All 13 open dependency PRs were reviewed against main at `316de2577e170c012331fc56f1d0c30ca51e4939`.
Their reported CI checks passed, but those runs predate several current security advisories.
The recommendation is to replace the overlapping updates with this combined, tested branch.
No PR has been merged or closed, and this branch has not been published.

## Decisions

| PR                                                     | Update                         | Applied result and decision                                                                                                                               |
| ------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#149](https://github.com/ivanoats/wsg-check/pull/149) | ip-address, express-rate-limit | Superseded by ip-address 10.7.2 and express-rate-limit 8.5.2.                                                                                             |
| [#158](https://github.com/ivanoats/wsg-check/pull/158) | qs, Express                    | Applied with Express 4.22.3 in Lighthouse's dependency tree. qs remains 6.15.3 with a development-only advisory; see below.                               |
| [#159](https://github.com/ivanoats/wsg-check/pull/159) | tmp                            | Applied 0.2.7 and its override.                                                                                                                           |
| [#166](https://github.com/ivanoats/wsg-check/pull/166) | Vite                           | Applied 8.0.16. Its pinned PostCSS dependency still has a development-only advisory.                                                                      |
| [#168](https://github.com/ivanoats/wsg-check/pull/168) | Undici                         | Superseded by 6.28.1 and 7.29.1, preserving both dependency branches.                                                                                     |
| [#169](https://github.com/ivanoats/wsg-check/pull/169) | form-data                      | Applied 4.0.6.                                                                                                                                            |
| [#171](https://github.com/ivanoats/wsg-check/pull/171) | Development group              | Applied with Vitest and coverage-v8 advanced together to 4.1.11 for security fixes. Remaining development findings are listed below.                      |
| [#172](https://github.com/ivanoats/wsg-check/pull/172) | Production group               | Applied; Next.js advanced further, and the real CO2.js integration was repaired and tested.                                                               |
| [#173](https://github.com/ivanoats/wsg-check/pull/173) | Axios                          | Applied 1.18.1, also included in the grouped updates. Real HTTP redirect smoke checks passed.                                                             |
| [#174](https://github.com/ivanoats/wsg-check/pull/174) | GitHub Actions                 | Applied the three SHA-pinned v7 upgrades. Reviewed release notes and existing workflow usage; original PR CI passed. Publishing itself was not exercised. |
| [#175](https://github.com/ivanoats/wsg-check/pull/175) | Hono                           | Superseded by 4.13.8 for newer advisories.                                                                                                                |
| [#176](https://github.com/ivanoats/wsg-check/pull/176) | fast-uri                       | Superseded by 3.1.8 for newer advisories.                                                                                                                 |
| [#177](https://github.com/ivanoats/wsg-check/pull/177) | Next.js                        | Superseded by 16.3.6; raised the manifest minimum as well as updating the lockfile.                                                                       |

Lockfile entries were combined relative to the common base, retaining newer overlapping versions.
Compatible audit fixes were then applied without `--force`; platform-specific optional packages remain in the lockfile.
`npm ci` and `npm ls --all` validate the resulting dependency graph.

## Findings addressed

- Next.js 16.2.11 is affected by a [critical image optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4); the patched 16.x line begins at 16.3.3. This branch uses 16.3.6.
- The older fast-uri update is still affected by [malformed IPv6 normalization](https://github.com/advisories/GHSA-f65p-4m7j-42xc) and other current advisories. This branch uses 3.1.8.
- CO2.js exports `hosting` as a function in ESM. The application called `hosting.check`, caught the resulting exception, and silently reported every host as non-green. This also affects the previously installed 0.18.0 release. The call and mock now match the actual API, and new integration tests stub only network access.
- Next.js 16.3 adds the required `bfcacheId` router property. The URL input test mock now provides it, restoring type checking.

The [setup-node v7 release](https://github.com/actions/setup-node/releases/tag/v7.0.0) removes its dummy token export and documents OIDC publishing. The existing publish job uses OIDC. Checkout's new fork restrictions concern `pull_request_target` and `workflow_run`, neither of which these updated workflows use. The [Codecov v7 release](https://github.com/codecov/codecov-action/releases/tag/v7.0.0) changes its key-distribution account and includes the preceding template-injection fix.

## Remaining security work

The unmodified combination of PR versions had 46 audit findings, including one critical finding.
The final production-only audit has **zero findings**. The full audit has **25 development-tooling findings: 16 high, 8 moderate, and 1 low**.

The underlying advisory-bearing packages are browserslist, effect, extract-zip, postcss, postcss-selector-parser, qs, and uuid. The remaining entries are affected parent tools, including Panda/Park UI, Lighthouse, and pa11y/Puppeteer. These tools process CSS, archives, browser data, or build inputs; development-only does not mean harmless.

Automatic remediation recommends substantial downgrades of some parent tools. Those were not applied. Resolve the pinned transitive dependencies through upstream-compatible releases or individually reviewed overrides in a separate change, with the same build, coverage, accessibility, and browser checks. This branch is not a claim that all development vulnerabilities are fixed.

## Validation

- Clean install from the final lockfile; dependency graph has no reported invalid dependencies.
- Node 22.22.0: 78 test files and 971 tests pass, including four real-library CO2.js integration cases.
- Coverage: 97.91% statements, 89.26% branches, 98.68% functions, 98.21% lines; all configured thresholds pass.
- ESLint, Prettier, TypeScript, Next.js production build, CLI build, and CLI help smoke check pass.
- Real Axios requests against a local HTTP server pass automatic and manual redirect checks.
- Production health endpoint returns `status: ok`.
- All 44 Playwright tests pass against the production server across the configured desktop, phone, and tablet Chromium profiles. The iPhone profile is Chromium emulation, not WebKit.
- pa11y passes all three configured pages with zero errors.
- Local Lighthouse collection and configured assertions pass for all three pages; no reports were uploaded to public storage.

The web build retains warnings about dynamic filesystem tracing in the existing configuration loader. Hosted CI must run on the combined branch before merge. npm publishing and deployment were not performed.

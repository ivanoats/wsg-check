# WSG Spec Versioning

How wsg-check tracks the [W3C Web Sustainability Guidelines](https://www.w3.org/TR/web-sustainability-guidelines/) (WSG), what changed in the spec since wsg-check was built, and a proposal for versioning wsg-check alongside the spec.

Source for everything below: the spec repository [`w3c/sustainableweb-wsg`](https://github.com/w3c/sustainableweb-wsg), compared at its release tags. Numbers such as `3.2` are the **position** of a guideline inside its section at a given release.

## 1. Which spec wsg-check targeted before pinning a release

This section describes wsg-check before it pinned the July-2026 release (step 2 in 5.6). It did not target one spec version. It mixed three:

| Where                                                          | Baseline                                                       | Evidence                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/guidelines-registry.ts` (static fallback, 72 rows) | Its own numbering, only partly from the pre-2025 draft         | Titles such as "Undertake Systemic Impacts Mapping" left `guidelines.json` in March 2025. Other titles, such as "Consider Dark Mode" and "Use Edge Computing", never appeared in the spec. Its numbers also differ from the checks' (registry `3.9` is render-blocking; the check uses `3.8`). None of the 72 titles match the Q4-2025 release. |
| `src/checks/*` (guideline IDs and `@see` links)                | Mostly the pre-2025 draft, a few later anchors                 | 32 of 35 check files link to anchors that no longer exist in the spec, e.g. `#optimise-browser-caching`, `#code-security`, `#compress-your-files`.                                                                                                                                                                                              |
| `src/config/wsg-api-*.ts` (live API client + types)            | Q4-2025 schema (types written against the 2026-01-16 snapshot) | Types expect numeric `id`, `benefits`, `GRI`, `resources`. The overlay uses the registry's own numbering (e.g. `3.21`–`3.26`), which no tagged release uses.                                                                                                                                                                                    |

## 2. Spec releases

The spec repo tags quarterly-ish snapshots:

| Tag         | Date       | `edition`        | Guidelines (UX / Dev / Hosting / Business) |
| ----------- | ---------- | ---------------- | ------------------------------------------ |
| `Q1-2025`   | 2025-03-25 | Editor's Draft   | 93 (29 / 23 / 12 / 29)                     |
| `Q2-2025`   | 2025-06-30 | Editor's Draft   | 92 (29 / 22 / 12 / 29)                     |
| `Q3-2025`   | 2025-09-15 | Editor's Draft   | 92 (29 / 22 / 12 / 29)                     |
| `Q4-2025`   | 2025-12-15 | Draft Note       | 80 (21 / 20 / 12 / 27)                     |
| `July-2026` | 2026-07-29 | Group Note Draft | **71 (17 / 16 / 12 / 26)**                 |

`main` has only editorial changes since `July-2026` (introduction text, credits). `guidelines.json` has `lastModified: 2026-07-28` on both.

## 3. What is new in the July-2026 release

### 3.1 Breaking changes to the JSON API

`https://w3c.github.io/sustainableweb-wsg/guidelines.json` changed shape on 2026-07-28 (upstream commit `9996ec5`, "Updates to JSON APIs & Locations"):

- **Guideline `id` is now a slug**, e.g. `"set-goals-based-on-performance-and-energy-impact"`, not `"1"`. `mapApiToGuidelineEntries` therefore builds IDs like `3.set-goals-based-on-performance-and-energy-impact`.
- **`benefits` and `GRI` are gone** from each guideline.
- **`resources` is gone** from each success criterion.
- `impact.json` and `star.json` were deleted. `benefits.html`, `glance.html`, `impact.html`, `policies.html`, `quickref.html`, `resources.html`, `star.html` and the whole `test-suite/` were moved out of the repo.
- `edition` changed from `"Draft Note"` to `"Group Note Draft"`. `specStatus` is `DNOTE`.
- Impact ratings (people / planet / prosperity, timeframe, related standards) are now only `data-*` attributes on each guideline's `<section>` in `index.html`. They are not in the JSON.
- Accessibility, security and privacy are now cross-cutting **considerations** (tags on each guideline), not guidelines of their own.

**Live impact on wsg-check:** the fetch still succeeds, so `GET /api/guidelines` serves the new data instead of the static fallback. Every guideline gets a slug-based ID and, because the `TESTABILITY_OVERLAY` keys no longer match, every guideline is reported as `manual-only`. `GET /api/guidelines/3.3` misses the live data and falls back to the pre-2025 static entry.

### 3.2 Guideline changes, Q4-2025 → July-2026

**Merged or removed (no successor with the same scope):**

- UX: _Provide clear, inclusive content with purpose_; _Provide accessible, usable, minimal web forms_; _Offer suitable alternatives for every format used_
- Dev: _Remove unnecessary or redundant information_; _Provide information to help understand the usefulness of a page_; _Validate form errors and account for tooling requirements_; _Ensure that your code is secure_
- Business: _Implement appropriate data management procedures_

**Merged into a new guideline:**

| Q4-2025                                                                                             | July-2026                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 2.4 Minimize non-essential content… + 2.5 Ensure that navigation and wayfinding are well-structured | 2.4 `design-efficient-and-streamlined-user-journeys` |
| 3.4 Remove unnecessary code (+ minification)                                                        | 3.2 `minify-and-remove-unused-code`                  |

**Renamed (same scope, new title and slug):**

| Q4-2025                                                              | July-2026                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 2.1 Examine and disclose any external factors…                       | 2.1 `identify-assess-disclose-review-and-mitigate-sustainability-impacts`       |
| 2.2 Understand user requirements or constraints, resolving barriers… | 2.2 `understand-user-requirements-or-constraints`                               |
| 2.11 Optimize media for sustainability                               | 2.9 `optimize-media-to-reduce-resource-use`                                     |
| 2.13 Use optimized and appropriate web typography                    | 2.11 `use-optimized-web-typography`                                             |
| 2.16 Provide useful notifications                                    | 2.12 `avoid-unwanted-notifications`                                             |
| 2.18 Involve users and contributors early in the project             | 2.14 `involve-users-early-in-the-project`                                       |
| 2.20 Verify that real-world users can successfully use your work     | 2.16 `validate-usability-through-testing-and-real-world-usage`                  |
| 2.21 Regularly test and maintain compatibility                       | 2.17 `provide-cross-platform-compatibility-support`                             |
| 3.6 Give third parties the same priority as first parties…           | 3.5 `treat-third-parties-the-same-as-first-parties`                             |
| 3.12 Use sustainability beneficial user preference media queries     | 3.9 `use-media-queries-that-support-sustainability-goals`                       |
| 3.14 Use standards-based JavaScript and APIs                         | 3.11 `use-sustainable-javascript-and-apis`                                      |
| 3.16 Use dependencies appropriately and ensure maintenance           | 3.12 `use-dependencies-sparingly-and-maintain-them`                             |
| 4.9 Consider the impact and requirements of data processing          | 4.9 `assess-the-impact-and-requirements-of-data-processing`                     |
| 4.10 Use Content Delivery Networks (CDNs) appropriately              | 4.10 `use-content-delivery-networks-cdns-when-beneficial`                       |
| 5.7 Validate efforts using established third-party certifications    | 5.7 `validate-web-sustainability-efforts-through-external-verification`         |
| 5.12 Document future updates and evolutions                          | 5.12 `document-updates-and-evolutions`                                          |
| 5.13 Establish if a digital product or service is necessary          | 5.13 `evaluate-if-a-digital-product-or-service-is-necessary`                    |
| 5.17 Use Justice, Equity, Diversity, Inclusion (JEDI) practices      | 5.17 `use-diversity-equity-justice-inclusion-deji-practices`                    |
| 5.21 Include responsible financial policies                          | 5.20 `adopt-responsible-financial-practices`                                    |
| 5.22 Include organizational philanthropy policies                    | 5.21 `adopt-organizational-philanthropy-practices`                              |
| 5.24 Include e-waste, right to repair, and recycling policies        | 5.23 `repair-reuse-refurbish-recycle-or-reduce-e-waste`                         |
| 5.25 Define performance and environmental budgets                    | 5.24 `define-performance-environmental-and-human-budgets` (adds a human budget) |
| 5.26 Use open source where possible                                  | 5.25 `use-and-contribute-to-open-source`                                        |

Every other guideline kept its title and slug but most were **renumbered**, because removals shift positions. For example, _Defer the loading of non-critical resources_ moved from 3.8 to 3.7. Success-criteria text was also rewritten across all four sections in July 2026 (the upstream `UX*`, `WD*`, `HIS*` and `BSPM*` PRs).

## 4. What this means for each check

The current check ID is the one passed to `withGuidelineId` in `src/checks/index.ts`.

| Check                                           | Current ID | July-2026 guideline                                                                                |
| ----------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `checkPageWeight`                               | 3.1        | 3.1 `set-goals-based-on-performance-and-energy-impact`                                             |
| `checkMinification`                             | 3.3        | 3.2 `minify-and-remove-unused-code`                                                                |
| `checkCssRedundancy`                            | 3.5        | 3.4 `avoid-redundancy-and-duplication-in-code`                                                     |
| `checkThirdParty`                               | 3.6        | 3.5 `treat-third-parties-the-same-as-first-parties`                                                |
| `checkSemanticHtml`                             | 3.7        | 3.6 `ensure-code-follows-good-semantic-practices`                                                  |
| `checkRenderBlocking`                           | 3.8        | 3.7 `defer-the-loading-of-non-critical-resources`                                                  |
| `checkMetadata`, `checkStructuredData`          | 3.4, 3.11  | 3.8 `structure-metadata-for-machine-readability`                                                   |
| `checkPreferenceMediaQueries`                   | 3.12       | 3.9 `use-media-queries-that-support-sustainability-goals`                                          |
| `checkResponsiveDesign`                         | 3.13       | 3.10 `ensure-layouts-work-for-different-devices-and-requirements`                                  |
| `checkSustainableJs`                            | 3.14       | 3.11 `use-sustainable-javascript-and-apis`                                                         |
| `checkDependencyCount`                          | 3.16       | 3.12 `use-dependencies-sparingly-and-maintain-them`                                                |
| `checkExpectedFiles`, `checkBeneficialFiles`    | 3.17       | 3.13 `include-expected-and-beneficial-files`                                                       |
| `checkHtmlVersion`                              | 3.19       | 3.15 `use-the-latest-stable-language-version`                                                      |
| `checkNavigationStructure`                      | 2.8        | 2.4 `design-efficient-and-streamlined-user-journeys`                                               |
| `checkAccessibilityAids`                        | 3.9        | 2.4 `design-efficient-and-streamlined-user-journeys` (content discovery)                           |
| `checkNonEssentialContent`                      | 2.9        | 2.5 `design-to-assist-and-not-to-distract`                                                         |
| `checkDeceptivePatterns`                        | 2.10       | 2.6 `avoid-being-manipulative-or-deceptive`                                                        |
| `checkOptimizedMedia`, `checkLazyLoading`       | 2.7, 2.11  | 2.9 `optimize-media-to-reduce-resource-use`                                                        |
| `checkAnimationControl`                         | 2.15       | 2.10 `ensure-animation-is-proportionate-and-easy-to-control`                                       |
| `checkWebTypography`, `checkFontStackFallbacks` | 2.16       | 2.11 `use-optimized-web-typography`                                                                |
| `checkDownloadableDocuments`                    | 2.17       | 2.13 `reduce-the-impact-of-downloadable-and-physical-documents`                                    |
| `checkSustainableHosting`                       | 4.1        | 4.1 `use-sustainable-hosting`                                                                      |
| `checkCaching`, `checkOfflineAccess`            | 4.2        | 4.2 `optimize-caching-and-support-offline-access`                                                  |
| `checkCompression`                              | 4.3        | 4.3 `reduce-data-transfer-with-compression`                                                        |
| `checkErrorPages`, `checkRedirects`             | 4.4        | 4.4 `setup-necessary-error-pages-and-redirection-links`                                            |
| `checkDataRefresh`                              | 4.7        | 4.7 `define-the-frequency-of-data-refreshes`                                                       |
| `checkCdnUsage`                                 | 4.10       | 4.10 `use-content-delivery-networks-cdns-when-beneficial`                                          |
| `checkSecurityHeaders`                          | 3.15       | **No guideline.** Security is now a consideration only.                                            |
| `checkFormValidation`                           | 3.10       | **No guideline.** Removed.                                                                         |
| `checkMinimalForms`                             | 2.19       | **No guideline.** Removed.                                                                         |
| `checkAltText`                                  | 2.17       | **No guideline.** "Offer suitable alternatives" was removed. Accessibility is now a consideration. |

The four checks with no guideline needed a decision. The options were to drop them, keep them as unscored related checks (outside the WSG score), or re-home them where a criterion partly fits. For example, _Beneficial files_ in 3.13 names `security.txt`, and _Alternative browsing_ in 3.10 covers assistive technology.

**Decision (step 3):** keep them as related checks. They run and appear in their own "Related checks (not scored)" report section, under the IDs `security-headers`, `form-validation`, `native-form-features` and `image-alt-text`. They are left out of every score.

## 5. Proposal: versioning wsg-check alongside the spec

### 5.1 Pin one spec release and vendor it

- Commit the tagged `guidelines.json` to the repo, e.g. `src/config/spec/wsg-july-2026.json`, together with its tag and upstream commit (`071d86c`).
- Generate `GUIDELINES_REGISTRY` from that file, keeping `TESTABILITY_OVERLAY` as the only hand-written part, so the registry and the spec cannot drift apart.
- Stop serving live data from `guidelines.json` on `main`. It changes without notice, as the July 2026 schema change showed. Detect drift with the tag watcher in 5.5 instead.

### 5.2 Make the slug the canonical guideline ID

- Slugs are the spec's own IDs, and they match the `#anchor` in the TR URL, so `specUrl` never goes stale.
- Positional numbers (`3.2`) change whenever a guideline is added or removed. Derive them from array order for display only.
- Keep an alias table (`3.3` → `minify-and-remove-unused-code`, …) so existing `--guidelines 3.3` CLI arguments and `/api/guidelines/3.3` calls still resolve, and print a deprecation warning.
- Build the aliases from the checks' numbering only. The old registry's numbers are dropped: they disagree with the checks' numbers, and several of its guidelines never existed in the spec.
- Replace hand-typed `RESOURCES` URLs in checks with `specUrl` from the registry.

### 5.3 Report the spec version everywhere

- The single source is `WSG_SPEC` in `src/config/spec/index.ts` (release tag, commit, edition, `lastModified`, URL), next to the vendored JSON. It is not duplicated into `package.json`, so the two cannot disagree.
- CLI `--version`: `0.2.0 (WSG July-2026)`.
- Reports (`SustainabilityReport.specVersion`, shown in the JSON, HTML, Markdown and terminal formats and on the results page) and `/api/health` (`specVersion`, plus the package `version`) name the release, so a stored report says which rule set produced the score.
- README badge and intro: "WSG July-2026 (Group Note Draft)".

### 5.4 Keep the npm version independent, with a clear bump policy

Do not put the spec version into the semver string (e.g. `0.2.0+wsg.2026-07`). npm ignores build metadata and release-please does not manage it. Instead:

| Spec change                                                               | wsg-check bump (while `0.x`) | After `1.0` |
| ------------------------------------------------------------------------- | ---------------------------- | ----------- |
| New spec release that changes IDs, removes guidelines, or changes scoring | minor (`feat!:`)             | major       |
| New spec release with editorial or success-criteria wording changes only  | patch (`fix:`)               | minor/patch |
| Wording tweaks on spec `main` between releases                            | none; wait for the next tag  | none        |

Each spec bump gets one CHANGELOG entry (`feat!: target WSG July-2026`) that links to this document's diff tables.

### 5.5 Automate drift detection

- The weekly `WSG spec watch` workflow (`.github/workflows/wsg-spec-watch.yml`) lists the tags in https://github.com/w3c/sustainableweb-wsg and opens an issue for each tag missing from `src/config/spec/upstream-tags.txt`, unless one already exists. After reviewing a release, add its tag to that file, whether or not wsg-check moves to it. A unit test checks that the vendored release is listed.
- A unit test asserts that every `guidelineId` in `src/checks/index.ts` exists in the vendored spec, and that every overlay key does too. With that test in place, this drift could not have happened silently. (Added in step 2: `tests/unit/config/guidelines-registry.test.ts`.)

### 5.6 Suggested order of work

1. **Fix now (patch), done in this PR:** `fetchWsgGuidelines` rejects responses with non-numeric guideline IDs, so `/api/guidelines` falls back to the static registry. This stops the "everything is manual-only" regression.
2. **Done:** vendor `July-2026`, generate the registry, and switch to slug IDs with a numeric alias table (`feat!:`). `/api/guidelines` now serves the vendored release and reports it in `spec`; the live `guidelines.json` fetch was removed.
3. **Done:** remap checks per section 4 and decide what to do with the four orphaned checks. Results now report the July-2026 slug, title, display number and spec link, set when each check is registered in `src/checks/index.ts`. The four orphans run as unscored related checks (see §4).
4. **Done:** `specVersion` in the CLI, reports and API (5.3), plus the tag-watcher workflow (5.5). The drift test is already in place.

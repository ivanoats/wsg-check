/**
 * TypeScript types for the W3C Web Sustainability Guidelines (WSG) JSON data
 * (`guidelines.json`), as published at a spec release tag.
 *
 * These types match the July-2026 release schema, in which guideline IDs are
 * slugs and the per-guideline `benefits` / `GRI` data and per-criterion
 * `resources` links were removed.
 *
 * @see https://github.com/w3c/sustainableweb-wsg
 * @see https://www.w3.org/TR/web-sustainability-guidelines/
 */

/** A single success criterion within a guideline. */
export interface WsgSpecCriterion {
  readonly title: string
  readonly description: string
}

/** A single guideline within a WSG section. */
export interface WsgSpecGuideline {
  /**
   * Stable slug identifier, e.g. `"minify-and-remove-unused-code"`.
   * It is also the fragment of the guideline's URL in the specification.
   */
  readonly id: string
  /** Canonical URL to the guideline in the W3C spec. */
  readonly url: string
  /** Full guideline title as it appears in the specification. */
  readonly guideline: string
  /** One-sentence summary of the guideline. */
  readonly subheading: string
  /** One or more success criteria that must be met to satisfy this guideline. */
  readonly criteria: ReadonlyArray<WsgSpecCriterion>
  /** Optional code example shown with the guideline. */
  readonly example?: string
  /** Classification tags (e.g. "Performance", "Accessibility", "Hardware"). */
  readonly tags: ReadonlyArray<string>
}

/**
 * A top-level section of the WSG specification.
 * Section `id` values correspond to WSG section numbers:
 *   - `"1"` → Introduction (no guidelines)
 *   - `"2"` → User Experience Design
 *   - `"3"` → Web Development
 *   - `"4"` → Hosting, Infrastructure, and Systems
 *   - `"5"` → Business Strategy And Product Management
 */
export interface WsgSpecCategory {
  readonly id: string
  readonly name: string
  /** Abbreviated display name (absent for Introduction). */
  readonly shortName?: string
  /** Guidelines belonging to this section (absent for Introduction). */
  readonly guidelines?: ReadonlyArray<WsgSpecGuideline>
}

/** Root object of a WSG `guidelines.json` file. */
export interface WsgSpecData {
  readonly title: string
  readonly edition: string
  /** ISO 8601 date of the most recent update, e.g. `"2026-07-28"`. */
  readonly lastModified: string
  readonly category: ReadonlyArray<WsgSpecCategory>
}

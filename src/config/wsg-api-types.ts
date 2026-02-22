/**
 * TypeScript types for the W3C Web Sustainability Guidelines (WSG) JSON API.
 *
 * The API is publicly available at:
 *   https://w3c.github.io/sustainableweb-wsg/guidelines.json
 *
 * These types reflect the JSON schema as of the 2026-01-16 snapshot.
 * The API is maintained by the W3C Sustainable Web Interest Group and is kept
 * in sync with the published specification.
 *
 * @see https://github.com/w3c/sustainableweb-wsg
 * @see https://www.w3.org/TR/web-sustainability-guidelines/
 */

/**
 * A single success criterion within a guideline.
 * Each guideline may have multiple criteria.
 */
export interface WsgApiCriterion {
  readonly title: string
  readonly description: string
  /**
   * Resource links: each element is a record of { "Link text": "https://url" }.
   */
  readonly resources: ReadonlyArray<Readonly<Record<string, string>>>
}

/**
 * Benefits of implementing this guideline, categorised by dimension.
 * Each element is a record of { "DimensionName": "Benefit description" }.
 */
export type WsgApiBenefits = ReadonlyArray<Readonly<Record<string, string>>>

/**
 * Global Reporting Initiative (GRI) impact levels for the guideline.
 * Keys are GRI topics (materials, energy, water, emissions); values are
 * impact levels (e.g. "Medium", "Low", "High").
 */
export type WsgApiGri = ReadonlyArray<Readonly<Record<string, string>>>

/**
 * A single guideline within a WSG section.
 *
 * The `id` here is a **relative** identifier within its parent category
 * (e.g. `"1"`, `"2"`). The **absolute** section.guideline ID (e.g. `"2.1"`)
 * is derived by combining the parent category's `id` with this field:
 * `${category.id}.${guideline.id}`.
 */
export interface WsgApiGuideline {
  /** Relative ID within the parent category, e.g. `"1"`. */
  readonly id: string
  /** Canonical URL to the section in the W3C spec. */
  readonly url: string
  /** Full guideline title as it appears in the specification. */
  readonly guideline: string
  /** One-sentence summary of the guideline. */
  readonly subheading: string
  /** One or more success criteria that must be met to satisfy this guideline. */
  readonly criteria: ReadonlyArray<WsgApiCriterion>
  /** Categorised benefits of implementing this guideline. */
  readonly benefits: WsgApiBenefits
  /** GRI standard impact levels. */
  readonly GRI: WsgApiGri
  /** Classification tags (e.g. "Performance", "Accessibility", "Hardware"). */
  readonly tags: ReadonlyArray<string>
}

/**
 * A top-level category in the WSG specification.
 * Category `id` values correspond to WSG section numbers:
 *   - `"1"` → Introduction (no guidelines)
 *   - `"2"` → User Experience Design
 *   - `"3"` → Web Development
 *   - `"4"` → Hosting, Infrastructure and Systems
 *   - `"5"` → Business Strategy and Product Management
 */
export interface WsgApiCategory {
  readonly id: string
  readonly name: string
  /** Abbreviated display name (absent for Introduction). */
  readonly shortName?: string
  /** Guidelines belonging to this section (absent for Introduction). */
  readonly guidelines?: ReadonlyArray<WsgApiGuideline>
}

/**
 * Root object of the W3C WSG guidelines JSON API response.
 */
export interface WsgApiResponse {
  readonly title: string
  readonly edition: string
  /** ISO 8601 date of the most recent update, e.g. `"2026-01-16"`. */
  readonly lastModified: string
  readonly category: ReadonlyArray<WsgApiCategory>
}

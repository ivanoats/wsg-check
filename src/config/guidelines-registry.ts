import type { GuidelineEntry, Testability, WSGCategory } from './types'
import type { WsgSpecData } from './wsg-spec-types'
import { WSG_SPEC_DATA } from './spec/index'

/**
 * Registry of W3C Web Sustainability Guidelines (WSG), generated from the
 * vendored spec release in `./spec` (see `WSG_SPEC`).
 *
 * Guideline IDs are the spec's slugs. Positional numbers (`"3.2"`) are kept
 * for display only, because they shift between spec releases.
 *
 * Testability levels are wsg-check's own assessment (the spec does not carry
 * them):
 *   - automated:       Can be fully checked programmatically
 *   - semi-automated:  Partially checkable; human judgment required
 *   - manual-only:     Requires human review
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/
 */

/** Maps spec section IDs to wsg-check categories. Section 1 has no guidelines. */
const SECTION_ID_TO_CATEGORY: Readonly<Record<string, WSGCategory>> = {
  '2': 'ux',
  '3': 'web-dev',
  '4': 'hosting',
  '5': 'business',
}

/**
 * wsg-check's assessment of which guidelines are machine-testable, keyed by
 * slug. Guidelines absent from this map are `'manual-only'`.
 */
export const TESTABILITY_OVERLAY: ReadonlyMap<string, Testability> = new Map<string, Testability>([
  // ── User Experience Design ────────────────────────────────────────────────
  ['design-efficient-and-streamlined-user-journeys', 'semi-automated'],
  ['design-to-assist-and-not-to-distract', 'semi-automated'],
  ['avoid-being-manipulative-or-deceptive', 'semi-automated'],
  ['optimize-media-to-reduce-resource-use', 'semi-automated'],
  ['ensure-animation-is-proportionate-and-easy-to-control', 'semi-automated'],
  ['use-optimized-web-typography', 'semi-automated'],
  ['reduce-the-impact-of-downloadable-and-physical-documents', 'semi-automated'],

  // ── Web Development ───────────────────────────────────────────────────────
  ['set-goals-based-on-performance-and-energy-impact', 'semi-automated'],
  ['minify-and-remove-unused-code', 'semi-automated'],
  ['avoid-redundancy-and-duplication-in-code', 'semi-automated'],
  ['treat-third-parties-the-same-as-first-parties', 'semi-automated'],
  ['ensure-code-follows-good-semantic-practices', 'semi-automated'],
  ['defer-the-loading-of-non-critical-resources', 'automated'],
  ['structure-metadata-for-machine-readability', 'automated'],
  ['use-media-queries-that-support-sustainability-goals', 'semi-automated'],
  ['ensure-layouts-work-for-different-devices-and-requirements', 'semi-automated'],
  ['use-sustainable-javascript-and-apis', 'semi-automated'],
  ['use-dependencies-sparingly-and-maintain-them', 'semi-automated'],
  ['include-expected-and-beneficial-files', 'automated'],
  ['use-the-latest-stable-language-version', 'semi-automated'],

  // ── Hosting, Infrastructure, and Systems ──────────────────────────────────
  ['use-sustainable-hosting', 'semi-automated'],
  ['optimize-caching-and-support-offline-access', 'automated'],
  ['reduce-data-transfer-with-compression', 'automated'],
  ['setup-necessary-error-pages-and-redirection-links', 'automated'],
  ['define-the-frequency-of-data-refreshes', 'semi-automated'],
  ['use-content-delivery-networks-cdns-when-beneficial', 'semi-automated'],
])

/**
 * Pre-2025 draft guideline numbers used by wsg-check's checks (and therefore
 * by `--guidelines` filters and reports), mapped to the July-2026 slug that
 * now covers the same scope. Used to look up a guideline by a legacy ID;
 * numeric IDs are deprecated as input because they are ambiguous across spec
 * releases.
 *
 * Do not use this map to decide which checks implement a guideline: `2.17`
 * is shared by the alt-text check (no July-2026 guideline) and the
 * downloadable-documents check. Each check declares its own slug instead
 * (`CheckFnWithId.guidelineSlug`); see {@link checkMatchesGuideline}.
 */
export const LEGACY_GUIDELINE_IDS: ReadonlyMap<string, string> = new Map([
  // ── User Experience Design ────────────────────────────────────────────────
  ['2.7', 'optimize-media-to-reduce-resource-use'],
  ['2.8', 'design-efficient-and-streamlined-user-journeys'],
  ['2.9', 'design-to-assist-and-not-to-distract'],
  ['2.10', 'avoid-being-manipulative-or-deceptive'],
  ['2.11', 'optimize-media-to-reduce-resource-use'],
  ['2.15', 'ensure-animation-is-proportionate-and-easy-to-control'],
  ['2.16', 'use-optimized-web-typography'],
  ['2.17', 'reduce-the-impact-of-downloadable-and-physical-documents'],

  // ── Web Development ───────────────────────────────────────────────────────
  ['3.1', 'set-goals-based-on-performance-and-energy-impact'],
  ['3.3', 'minify-and-remove-unused-code'],
  ['3.4', 'structure-metadata-for-machine-readability'],
  ['3.5', 'avoid-redundancy-and-duplication-in-code'],
  ['3.6', 'treat-third-parties-the-same-as-first-parties'],
  ['3.7', 'ensure-code-follows-good-semantic-practices'],
  ['3.8', 'defer-the-loading-of-non-critical-resources'],
  ['3.9', 'design-efficient-and-streamlined-user-journeys'],
  ['3.11', 'structure-metadata-for-machine-readability'],
  ['3.12', 'use-media-queries-that-support-sustainability-goals'],
  ['3.13', 'ensure-layouts-work-for-different-devices-and-requirements'],
  ['3.14', 'use-sustainable-javascript-and-apis'],
  ['3.16', 'use-dependencies-sparingly-and-maintain-them'],
  ['3.17', 'include-expected-and-beneficial-files'],
  ['3.19', 'use-the-latest-stable-language-version'],

  // ── Hosting, Infrastructure, and Systems ──────────────────────────────────
  ['4.1', 'use-sustainable-hosting'],
  ['4.2', 'optimize-caching-and-support-offline-access'],
  ['4.3', 'reduce-data-transfer-with-compression'],
  ['4.4', 'setup-necessary-error-pages-and-redirection-links'],
  ['4.7', 'define-the-frequency-of-data-refreshes'],
  ['4.10', 'use-content-delivery-networks-cdns-when-beneficial'],
])

/**
 * Pre-2025 draft numbers used only by checks whose guideline was removed from
 * the spec (form validation 3.10, security headers 3.15, minimal forms 2.19).
 * These checks now run as related (unscored) checks; see `relatedId` on
 * `CheckFnWithId`.
 */
export const UNMAPPED_LEGACY_IDS: ReadonlySet<string> = new Set(['2.19', '3.10', '3.15'])

/**
 * Maps spec data to {@link GuidelineEntry} objects: slug IDs, positional
 * numbers, categories from the section, and testability from the overlay.
 */
export const mapSpecToGuidelineEntries = (
  spec: WsgSpecData,
  overlay: ReadonlyMap<string, Testability>
): GuidelineEntry[] =>
  spec.category.flatMap((section) => {
    const category = SECTION_ID_TO_CATEGORY[section.id]
    if (category === undefined || section.guidelines === undefined) return []

    return section.guidelines.map((guideline, index) => ({
      id: guideline.id,
      number: `${section.id}.${String(index + 1)}`,
      title: guideline.guideline,
      section: section.name,
      category,
      testability: overlay.get(guideline.id) ?? 'manual-only',
      description: guideline.subheading,
      specUrl: guideline.url,
    }))
  })

export const GUIDELINES_REGISTRY: ReadonlyArray<GuidelineEntry> = mapSpecToGuidelineEntries(
  WSG_SPEC_DATA,
  TESTABILITY_OVERLAY
)

/**
 * Resolves a guideline slug or a legacy numeric ID to a slug in the targeted
 * spec release. Returns `undefined` for unknown IDs.
 */
export function resolveGuidelineId(id: string): string | undefined {
  if (GUIDELINES_REGISTRY.some((g) => g.id === id)) return id
  return LEGACY_GUIDELINE_IDS.get(id)
}

/** Returns `true` for a legacy numeric ID such as `"3.3"`. */
export function isLegacyGuidelineId(id: string): boolean {
  return LEGACY_GUIDELINE_IDS.has(id) || UNMAPPED_LEGACY_IDS.has(id)
}

/** The guideline identity a check carries (see `CheckFnWithId`). */
export interface GuidelineTaggedCheck {
  readonly guidelineId: string
  readonly guidelineSlug: string | null
  readonly relatedId: string | null
}

/**
 * Returns `true` when a check should run for a requested guideline ID.
 *
 * - A legacy numeric ID (e.g. `"3.3"`) matches exactly the checks registered
 *   under that ID, as before slugs existed.
 * - Anything else matches checks that declare it as their slug or as their
 *   related-check ID, so a slug never selects a check for a different
 *   guideline.
 */
export function checkMatchesGuideline(check: GuidelineTaggedCheck, requested: string): boolean {
  if (isLegacyGuidelineId(requested)) return check.guidelineId === requested
  return requested === check.guidelineSlug || requested === check.relatedId
}

/**
 * Look up a guideline by slug, or by legacy numeric ID (e.g. `"3.3"`).
 * Returns undefined if the ID is not found.
 */
export function getGuidelineById(id: string): GuidelineEntry | undefined {
  const slug = resolveGuidelineId(id)
  return slug === undefined ? undefined : GUIDELINES_REGISTRY.find((g) => g.id === slug)
}

/**
 * Return all guidelines for a given category.
 */
export function getGuidelinesByCategory(category: GuidelineEntry['category']): GuidelineEntry[] {
  return GUIDELINES_REGISTRY.filter((g) => g.category === category)
}

/**
 * Return all guidelines with a specific testability level.
 */
export function getGuidelinesByTestability(
  testability: GuidelineEntry['testability']
): GuidelineEntry[] {
  return GUIDELINES_REGISTRY.filter((g) => g.testability === testability)
}

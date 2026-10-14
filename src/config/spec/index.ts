/**
 * The W3C Web Sustainability Guidelines (WSG) release that wsg-check targets.
 *
 * `wsg-september-2026.json` is a byte-identical copy of `guidelines.json` at
 * commit `c794dbc` of https://github.com/w3c/sustainableweb-wsg, the source of
 * the 24 September 2026 Group Note Draft on w3.org/TR. Upstream has not tagged
 * that commit. To move to a newer release, vendor its `guidelines.json` next to
 * this file, update {@link WSG_SPEC}, and follow SPEC_VERSIONING.md.
 */

import type { WsgSpecData } from '../wsg-spec-types'
import specJson from './wsg-september-2026.json'

/** Provenance of the vendored spec data. */
export interface WsgSpecInfo {
  /** Release name, e.g. `"September-2026"`. Matches `tag` when upstream tagged it. */
  readonly release: string
  /**
   * Release tag in w3c/sustainableweb-wsg, e.g. `"July-2026"`, or `null` when
   * the release is a dated W3C publication whose commit upstream has not tagged.
   */
  readonly tag: string | null
  /** Commit the release was taken from. */
  readonly commit: string
  /** Document status, e.g. `"Group Note Draft"`. */
  readonly edition: string
  /** `lastModified` date recorded in the spec data. */
  readonly lastModified: string
  /** Published specification URL. */
  readonly url: string
}

export const WSG_SPEC_DATA: WsgSpecData = specJson

export const WSG_SPEC: WsgSpecInfo = {
  release: 'September-2026',
  tag: null,
  commit: 'c794dbc23cc20299d460ef2e6d1cce4c31456c32',
  edition: WSG_SPEC_DATA.edition,
  lastModified: WSG_SPEC_DATA.lastModified,
  url: 'https://www.w3.org/TR/web-sustainability-guidelines/',
}

/**
 * The W3C Web Sustainability Guidelines (WSG) release that wsg-check targets.
 *
 * `wsg-july-2026.json` is a byte-identical copy of `guidelines.json` at the
 * `July-2026` tag of https://github.com/w3c/sustainableweb-wsg. To move to a
 * newer release, vendor its `guidelines.json` next to this file, update
 * {@link WSG_SPEC}, and follow SPEC_VERSIONING.md.
 */

import type { WsgSpecData } from '../wsg-spec-types'
import specJson from './wsg-july-2026.json'

/** Provenance of the vendored spec data. */
export interface WsgSpecInfo {
  /** Release tag in w3c/sustainableweb-wsg, e.g. `"July-2026"`. */
  readonly release: string
  /** Commit the release tag points to. */
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
  release: 'July-2026',
  commit: '071d86c57f2976e7e8183f19faf170c7f904a465',
  edition: WSG_SPEC_DATA.edition,
  lastModified: WSG_SPEC_DATA.lastModified,
  url: 'https://www.w3.org/TR/web-sustainability-guidelines/',
}

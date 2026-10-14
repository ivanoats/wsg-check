import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { WSG_SPEC, WSG_SPEC_DATA } from '@/config/spec/index'

/** Tags listed in the file the WSG spec watch workflow compares upstream tags against. */
const reviewedTags = readFileSync(join(process.cwd(), 'src/config/spec/upstream-tags.txt'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))

describe('upstream-tags.txt', () => {
  it('lists the vendored release tag, so the watcher never reports it as new', () => {
    // An untagged release (a dated W3C publication) has nothing to list yet; the
    // watcher opens an issue when upstream tags it.
    if (WSG_SPEC.tag !== null) {
      expect(reviewedTags).toContain(WSG_SPEC.tag)
      expect(WSG_SPEC.release).toBe(WSG_SPEC.tag)
    }
  })

  it('lists each tag once', () => {
    expect(new Set(reviewedTags).size).toBe(reviewedTags.length)
  })
})

describe('WSG_SPEC', () => {
  it('pins a full commit hash', () => {
    expect(WSG_SPEC.commit).toMatch(/^[0-9a-f]{40}$/)
  })
})

describe('vendored success criteria', () => {
  const criteria = WSG_SPEC_DATA.category.flatMap((section) =>
    (section.guidelines ?? []).flatMap((guideline) => guideline.criteria)
  )

  it('have unique slugs', () => {
    const ids = criteria.map((criterion) => criterion.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('use the spec URL fragment as the slug', () => {
    for (const criterion of criteria) {
      expect(criterion.url).toBe(
        `https://www.w3.org/TR/web-sustainability-guidelines/#${criterion.id}`
      )
    }
  })
})

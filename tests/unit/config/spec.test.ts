import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { WSG_SPEC } from '@/config/spec/index'

/** Tags listed in the file the WSG spec watch workflow compares upstream tags against. */
const reviewedTags = readFileSync(join(process.cwd(), 'src/config/spec/upstream-tags.txt'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))

describe('upstream-tags.txt', () => {
  it('lists the vendored release, so the watcher never reports it as new', () => {
    expect(reviewedTags).toContain(WSG_SPEC.release)
  })

  it('lists each tag once', () => {
    expect(new Set(reviewedTags).size).toBe(reviewedTags.length)
  })
})

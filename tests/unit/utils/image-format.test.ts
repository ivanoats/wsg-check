import { describe, it, expect } from 'vitest'
import { isVectorImage } from '@/utils/image-format'
import { isVectorImage as isVectorImageFromIndex } from '@/utils'

describe('isVectorImage', () => {
  it.each([
    ['https://x.test/icon.svg', 'absolute .svg'],
    ['https://x.test/icon.svg?v=2', 'query string is ignored'],
    ['https://x.test/icon.SVG#a', 'extension is case-insensitive and fragment is ignored'],
    ['https://x.test/logo.svgz', 'compressed .svgz'],
    ['icon.svg?v=2', 'relative URL (not parseable by new URL)'],
    ['data:image/svg+xml;base64,PHN2Zy8+', 'SVG data URI'],
    ['DATA:image/svg+xml,%3Csvg%2F%3E', 'data URI prefix is case-insensitive'],
  ])('returns true for %s (%s)', (url) => {
    expect(isVectorImage(url)).toBe(true)
  })

  it.each([
    ['https://x.test/photo.jpg', 'JPEG'],
    ['https://x.test/photo.webp', 'WebP'],
    ['https://x.test/svg/photo.png', '"svg" in a directory name, not the extension'],
    ['data:image/png;base64,iVBORw0KGgo=', 'non-SVG data URI'],
    // Detection is extension-based; format negotiated via query parameters is not visible.
    ['https://x.test/image?format=svg', 'extensionless URL with a format query parameter'],
  ])('returns false for %s (%s)', (url) => {
    expect(isVectorImage(url)).toBe(false)
  })

  it('is exported from the utils index', () => {
    expect(isVectorImageFromIndex).toBe(isVectorImage)
  })
})

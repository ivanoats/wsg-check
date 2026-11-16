/**
 * Image format helpers. Images are never fetched, so detection is by
 * extension, or by the MIME type inside a `data:` URI.
 */

/** Vector formats, to which WebP/AVIF and srcset do not apply. */
const VECTOR_IMAGE_EXTENSIONS: ReadonlyArray<string> = ['.svg', '.svgz']
const SVG_DATA_URI_PREFIX = 'data:image/svg+xml'

/** Lower-cased URL path; also handles relative URLs. */
export const imagePathname = (url: string): string => {
  try {
    return new URL(url).pathname.toLowerCase()
  } catch {
    return url.toLowerCase().split(/[?#]/, 1)[0]
  }
}

/** `true` for SVG images (by extension, or a data:image/svg+xml URI). */
export const isVectorImage = (url: string): boolean => {
  // `new URL()` parses data: URIs without throwing, so this test cannot rely on the pathname.
  if (url.toLowerCase().startsWith(SVG_DATA_URI_PREFIX)) return true
  const pathname = imagePathname(url)
  return VECTOR_IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}

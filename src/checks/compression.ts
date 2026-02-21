/**
 * WSG 4.3 – Compress Your Files
 *
 * Verifies that the HTML response was delivered with HTTP content encoding
 * (gzip, Brotli, zstd, or deflate).  Compression significantly reduces the
 * bytes transferred over the network — typically 60–80 % for HTML, CSS, and
 * JavaScript — directly lowering the carbon cost of each page view.
 *
 * Detection: the `Content-Encoding` response header is checked.  A missing or
 * empty header means the response was sent uncompressed (or the compression
 * info was stripped by an intermediary, in which case the recommendation still
 * applies).
 *
 * Scoring:
 *   - Brotli (`br`) detected          → pass  (100)  highest compression ratio
 *   - gzip / zstd / deflate detected  → pass  (100)
 *   - No Content-Encoding present      → fail    (0)
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/#compress-your-files
 */

import type { CheckFn } from '../core/types.js'

const GUIDELINE_ID = '4.3'
const GUIDELINE_NAME = 'Compress Your Files'
const SUCCESS_CRITERION =
  'HTML responses should be delivered with gzip or Brotli content encoding to reduce transfer size'
const RESOURCES = ['https://www.w3.org/TR/web-sustainability-guidelines/#compress-your-files']

/** Recognised lossless text compression encodings. */
const COMPRESSION_ENCODINGS = new Set(['gzip', 'x-gzip', 'br', 'zstd', 'deflate'])

export const checkCompression: CheckFn = (page) => {
  const encoding = (page.fetchResult.headers['content-encoding'] ?? '').toLowerCase().trim()

  const isCompressed = encoding.length > 0 && COMPRESSION_ENCODINGS.has(encoding)

  if (isCompressed) {
    const isBrotli = encoding === 'br'
    return {
      guidelineId: GUIDELINE_ID,
      guidelineName: GUIDELINE_NAME,
      successCriterion: SUCCESS_CRITERION,
      status: 'pass',
      score: 100,
      message: `Response is compressed with ${isBrotli ? 'Brotli (br)' : encoding} encoding.`,
      details: `Content-Encoding: ${encoding}`,
      ...(isBrotli
        ? {}
        : {
            recommendation:
              'Brotli (br) encoding typically achieves 15–25 % better compression than gzip. ' +
              'Consider enabling Brotli on your server or CDN for even smaller transfer sizes.',
          }),
      impact: 'high',
      category: 'hosting',
      machineTestable: true,
    }
  }

  return {
    guidelineId: GUIDELINE_ID,
    guidelineName: GUIDELINE_NAME,
    successCriterion: SUCCESS_CRITERION,
    status: 'fail',
    score: 0,
    message: 'Response does not appear to use content encoding (no Content-Encoding header found).',
    details:
      'A missing Content-Encoding header indicates the response was not compressed, ' +
      'or that compression info was stripped by a proxy. Either way, compression should ' +
      'be confirmed at the origin.',
    recommendation:
      'Enable gzip or Brotli compression on your web server or CDN for all text-based ' +
      'responses (HTML, CSS, JavaScript, SVG, JSON). In nginx: "gzip on; gzip_types text/html ' +
      'text/css application/javascript;". In Apache: enable mod_deflate or mod_brotli.',
    resources: RESOURCES,
    impact: 'high',
    category: 'hosting',
    machineTestable: true,
  }
}

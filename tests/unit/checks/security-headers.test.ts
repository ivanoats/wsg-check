import { describe, it, expect } from 'vitest'
import { checkSecurityHeaders } from '@/checks/security-headers'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ALL_SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'",
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
}

function makePageData(headers: Record<string, string> = {}): PageData {
  const body = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers,
      body,
      redirectChain: [],
      fromCache: false,
      contentLength: body.length,
    },
    parsedPage: {
      title: 'Test',
      lang: 'en',
      metaTags: [],
      links: [],
      resources: [],
      headings: [],
      hasSkipLink: false,
      landmarks: [],
      ariaAttributes: [],
      structuredData: [],
      doctype: '<!DOCTYPE html>',
      formInputs: [],
    },
    pageWeight: {
      htmlSize: body.length,
      resourceCount: 0,
      firstPartyCount: 0,
      thirdPartyCount: 0,
      compression: { isCompressed: false },
      byType: { stylesheet: 0, script: 0, image: 0, font: 0, media: 0, other: 0 },
    },
  } as PageData
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkSecurityHeaders (WSG 3.15)', () => {
  it('returns guidelineId 3.15', async () => {
    const result = await checkSecurityHeaders(makePageData(ALL_SECURITY_HEADERS))
    expect(result.guidelineId).toBe('3.15')
  })

  it('returns category web-dev', async () => {
    const result = await checkSecurityHeaders(makePageData(ALL_SECURITY_HEADERS))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkSecurityHeaders(makePageData(ALL_SECURITY_HEADERS))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when all security headers are present', async () => {
    const result = await checkSecurityHeaders(makePageData(ALL_SECURITY_HEADERS))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when 1 security header is missing', async () => {
    const headers = { ...ALL_SECURITY_HEADERS }
    delete (headers as Record<string, string>)['referrer-policy']
    const result = await checkSecurityHeaders(makePageData(headers))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when 2 security headers are missing', async () => {
    const headers = { ...ALL_SECURITY_HEADERS }
    delete (headers as Record<string, string>)['referrer-policy']
    delete (headers as Record<string, string>)['x-content-type-options']
    const result = await checkSecurityHeaders(makePageData(headers))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fails when 3 or more security headers are missing', async () => {
    const result = await checkSecurityHeaders(makePageData({}))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('includes missing header names in the message when failing', async () => {
    const result = await checkSecurityHeaders(makePageData({}))
    expect(result.message).toContain('Content-Security-Policy')
    expect(result.message).toContain('Strict-Transport-Security')
  })

  it('includes a recommendation and resources link on failure', async () => {
    const result = await checkSecurityHeaders(makePageData({}))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('has high impact', async () => {
    const result = await checkSecurityHeaders(makePageData({}))
    expect(result.impact).toBe('high')
  })
})

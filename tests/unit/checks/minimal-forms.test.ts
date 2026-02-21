import { describe, it, expect } from 'vitest'
import { checkMinimalForms } from '@/checks/minimal-forms'
import type { PageData } from '@/core/types'
import type { FormInputInfo } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<FormInputInfo> = {}): FormInputInfo {
  return {
    type: 'text',
    hasLabel: true,
    hasAutocomplete: true,
    hasInputmode: true,
    ...overrides,
  }
}

function makePageData(formInputs: FormInputInfo[]): PageData {
  const body = '<!DOCTYPE html><html><head></head><body></body></html>'
  return {
    url: 'https://example.com',
    fetchResult: {
      url: 'https://example.com',
      originalUrl: 'https://example.com',
      statusCode: 200,
      headers: {},
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
      formInputs,
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

describe('checkMinimalForms (WSG 2.19)', () => {
  it('returns guidelineId 2.19', async () => {
    const result = await checkMinimalForms(makePageData([]))
    expect(result.guidelineId).toBe('2.19')
  })

  it('returns category ux', async () => {
    const result = await checkMinimalForms(makePageData([]))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkMinimalForms(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when there are no form inputs', async () => {
    const result = await checkMinimalForms(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('passes when form has few fields, all with autocomplete and inputmode', async () => {
    const inputs = [
      makeInput({ type: 'email', hasAutocomplete: true, hasInputmode: true }),
      makeInput({ type: 'text', hasAutocomplete: true, hasInputmode: true }),
    ]
    const result = await checkMinimalForms(makePageData(inputs))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when more than 12 fields are present', async () => {
    const inputs = Array.from({ length: 13 }, () => makeInput())
    const result = await checkMinimalForms(makePageData(inputs))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.details).toContain('13')
  })

  it('warns when between 8 and 12 fields are present', async () => {
    const inputs = Array.from({ length: 8 }, () => makeInput())
    const result = await checkMinimalForms(makePageData(inputs))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('fails when no inputs use autocomplete', async () => {
    const inputs = [
      makeInput({ hasAutocomplete: false, hasInputmode: true }),
      makeInput({ hasAutocomplete: false, hasInputmode: true }),
    ]
    const result = await checkMinimalForms(makePageData(inputs))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
    expect(result.details).toContain('autocomplete')
  })

  it('warns when no inputs use inputmode', async () => {
    const inputs = [makeInput({ hasAutocomplete: true, hasInputmode: false })]
    const result = await checkMinimalForms(makePageData(inputs))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('inputmode')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkMinimalForms(
      makePageData([makeInput({ hasAutocomplete: false, hasInputmode: false })])
    )
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})

import { describe, it, expect } from 'vitest'
import { checkFormValidation } from '@/checks/form-validation'
import type { PageData } from '@/core/types'
import type { FormInputInfo } from '@/utils/html-parser'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<FormInputInfo> = {}): FormInputInfo {
  return {
    type: 'text',
    hasLabel: true,
    hasAutocomplete: true,
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

describe('checkFormValidation (WSG 3.12)', () => {
  it('returns guidelineId 3.12', async () => {
    const result = await checkFormValidation(makePageData([]))
    expect(result.guidelineId).toBe('3.12')
  })

  it('returns category web-dev', async () => {
    const result = await checkFormValidation(makePageData([]))
    expect(result.category).toBe('web-dev')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkFormValidation(makePageData([]))
    expect(result.machineTestable).toBe(true)
  })

  it('returns not-applicable when there are no form inputs', async () => {
    const result = await checkFormValidation(makePageData([]))
    expect(result.status).toBe('not-applicable')
  })

  it('passes when all inputs are labelled and use autocomplete', async () => {
    const inputs = [
      makeInput({ type: 'email', hasLabel: true, hasAutocomplete: true }),
      makeInput({ type: 'password', hasLabel: true, hasAutocomplete: true }),
    ]
    const result = await checkFormValidation(makePageData(inputs))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('fails when any input is missing a label', async () => {
    const inputs = [
      makeInput({ hasLabel: true, hasAutocomplete: true }),
      makeInput({ hasLabel: false, hasAutocomplete: true }),
    ]
    const result = await checkFormValidation(makePageData(inputs))
    expect(result.status).toBe('fail')
    expect(result.score).toBe(0)
  })

  it('fail result includes unlabelled input count in details', async () => {
    const inputs = [
      makeInput({ hasLabel: false }),
      makeInput({ hasLabel: false }),
      makeInput({ hasLabel: true }),
    ]
    const result = await checkFormValidation(makePageData(inputs))
    expect(result.details).toContain('2')
    expect(result.details).toContain('3')
  })

  it('warns when inputs are labelled but none use autocomplete', async () => {
    const inputs = [
      makeInput({ hasLabel: true, hasAutocomplete: false }),
      makeInput({ hasLabel: true, hasAutocomplete: false }),
    ]
    const result = await checkFormValidation(makePageData(inputs))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
    expect(result.details).toContain('autocomplete')
  })

  it('passes when some (not all) inputs use autocomplete', async () => {
    // At least one has autocomplete — this satisfies the check
    const inputs = [
      makeInput({ hasLabel: true, hasAutocomplete: true }),
      makeInput({ hasLabel: true, hasAutocomplete: false }),
    ]
    const result = await checkFormValidation(makePageData(inputs))
    expect(result.status).toBe('pass')
  })

  it('includes a recommendation and resources link on fail', async () => {
    const result = await checkFormValidation(makePageData([makeInput({ hasLabel: false })]))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })

  it('pass message includes the total input count', async () => {
    const inputs = [
      makeInput({ hasLabel: true, hasAutocomplete: true }),
      makeInput({ hasLabel: true, hasAutocomplete: true }),
    ]
    const result = await checkFormValidation(makePageData(inputs))
    expect(result.message).toContain('2')
  })
})

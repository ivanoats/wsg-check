import { describe, it, expect } from 'vitest'
import { checkDownloadableDocuments } from '@/checks/downloadable-documents'
import type { PageData } from '@/core/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePageData(body: string): PageData {
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

const NO_DOCS_BODY = `<!DOCTYPE html><html><body>
  <a href="https://example.com/about">About</a>
  <a href="/contact">Contact</a>
</body></html>`

const PDF_BODY = `<!DOCTYPE html><html><body>
  <a href="/files/report.pdf">Annual Report</a>
</body></html>`

const DOCX_BODY = `<!DOCTYPE html><html><body>
  <a href="/docs/template.docx">Download Template</a>
</body></html>`

const MULTIPLE_DOCS_BODY = `<!DOCTYPE html><html><body>
  <a href="/report.pdf">PDF Report</a>
  <a href="/slides.pptx">Presentation</a>
  <a href="/data.xlsx">Spreadsheet</a>
</body></html>`

const ZIP_BODY = `<!DOCTYPE html><html><body>
  <a href="/assets/resources.zip">Download Resources</a>
</body></html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkDownloadableDocuments (WSG 2.17)', () => {
  it('returns guidelineId 2.17', async () => {
    const result = await checkDownloadableDocuments(makePageData(NO_DOCS_BODY))
    expect(result.guidelineId).toBe('2.17')
  })

  it('returns category ux', async () => {
    const result = await checkDownloadableDocuments(makePageData(NO_DOCS_BODY))
    expect(result.category).toBe('ux')
  })

  it('is marked as machine-testable', async () => {
    const result = await checkDownloadableDocuments(makePageData(NO_DOCS_BODY))
    expect(result.machineTestable).toBe(true)
  })

  it('passes when no document links are present', async () => {
    const result = await checkDownloadableDocuments(makePageData(NO_DOCS_BODY))
    expect(result.status).toBe('pass')
    expect(result.score).toBe(100)
  })

  it('warns when a PDF link is present', async () => {
    const result = await checkDownloadableDocuments(makePageData(PDF_BODY))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when a DOCX link is present', async () => {
    const result = await checkDownloadableDocuments(makePageData(DOCX_BODY))
    expect(result.status).toBe('warn')
    expect(result.score).toBe(50)
  })

  it('warns when a ZIP link is present', async () => {
    const result = await checkDownloadableDocuments(makePageData(ZIP_BODY))
    expect(result.status).toBe('warn')
  })

  it('reports the correct count of document links', async () => {
    const result = await checkDownloadableDocuments(makePageData(MULTIPLE_DOCS_BODY))
    expect(result.message).toContain('3')
  })

  it('includes detected file formats in the message', async () => {
    const result = await checkDownloadableDocuments(makePageData(PDF_BODY))
    expect(result.message).toContain('.pdf')
  })

  it('includes a recommendation and resources link on warn', async () => {
    const result = await checkDownloadableDocuments(makePageData(PDF_BODY))
    expect(result.recommendation).toBeDefined()
    expect(result.resources).toBeDefined()
    expect(result.resources![0]).toContain('w3.org')
  })
})

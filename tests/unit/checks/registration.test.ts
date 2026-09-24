import { describe, it, expect } from 'vitest'
import { performanceChecks, securityChecks } from '@/checks/index'
import type { CheckFnWithId, PageData } from '@/core/types'
import { CheckError } from '@/utils/errors'

/** A page object with nothing in it, which makes any check throw. */
const BROKEN_PAGE = {} as PageData

/** Runs a check and returns what it threw (or `undefined` if it resolved). */
const errorFrom = async (check: CheckFnWithId | undefined): Promise<unknown> => {
  if (check === undefined) throw new Error('check not registered')
  try {
    await check(BROKEN_PAGE)
    return undefined
  } catch (error) {
    return error
  }
}

const securityHeaders = securityChecks.find((check) => check.relatedId === 'security-headers')

describe('check registration', () => {
  it('re-throws a WSG check error as a CheckError under its July-2026 slug', async () => {
    const error = await errorFrom(performanceChecks[0])

    expect(error).toBeInstanceOf(CheckError)
    expect(error).toMatchObject({ guidelineId: 'minify-and-remove-unused-code', related: false })
  })

  it('carries the guideline title, number and spec link on a WSG check error', async () => {
    const error = await errorFrom(performanceChecks[0])

    expect(error).toMatchObject({
      identity: {
        guidelineName: 'Minify and remove unused code',
        guidelineNumber: '3.2',
        resources: [expect.stringContaining('#minify-and-remove-unused-code')],
      },
    })
  })

  it('re-throws a related check error as a related CheckError', async () => {
    const error = await errorFrom(securityHeaders)

    expect(error).toBeInstanceOf(CheckError)
    expect(error).toMatchObject({
      guidelineId: 'security-headers',
      related: true,
      identity: { guidelineName: 'Security headers', related: true },
    })
  })

  it('exposes legacy ID, slug and related ID for filtering', () => {
    const identity = (check: CheckFnWithId | undefined) => ({
      guidelineId: check?.guidelineId,
      guidelineSlug: check?.guidelineSlug,
      relatedId: check?.relatedId,
    })

    expect(identity(securityHeaders)).toEqual({
      guidelineId: '3.15',
      guidelineSlug: null,
      relatedId: 'security-headers',
    })
    expect(identity(performanceChecks[0])).toEqual({
      guidelineId: '3.3',
      guidelineSlug: 'minify-and-remove-unused-code',
      relatedId: null,
    })
  })
})

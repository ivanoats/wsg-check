import { describe, it, expect } from 'vitest'
import { raceAbort } from '@/utils/abort'

describe('raceAbort', () => {
  it('returns the promise result without a signal', async () => {
    expect(await raceAbort(Promise.resolve('done'), undefined, 'aborted')).toBe('done')
  })

  it('returns the abort value at once when the signal has already fired', async () => {
    expect(await raceAbort(new Promise(() => undefined), AbortSignal.abort(), 'aborted')).toBe(
      'aborted'
    )
  })

  it('returns the abort value when the signal fires first', async () => {
    const controller = new AbortController()
    const pending = raceAbort(new Promise(() => undefined), controller.signal, 'aborted')
    controller.abort()
    expect(await pending).toBe('aborted')
  })

  it('passes through the result and rejections when the signal never fires', async () => {
    const { signal } = new AbortController()
    expect(await raceAbort(Promise.resolve(1), signal, 0)).toBe(1)
    await expect(raceAbort(Promise.reject(new Error('boom')), signal, 0)).rejects.toThrow('boom')
  })
})

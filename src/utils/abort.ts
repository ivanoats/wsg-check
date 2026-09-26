/**
 * Abort helpers for work that takes no `AbortSignal` of its own.
 */

/**
 * Settles with `onAbort` as soon as `signal` fires (or at once if it already
 * has), otherwise with `promise`. The underlying work is not cancelled; the
 * caller just stops waiting for it.
 */
export const raceAbort = <T, U>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  onAbort: U
): Promise<T | U> => {
  if (!signal) return promise
  if (signal.aborted) return Promise.resolve(onAbort)
  return new Promise<T | U>((resolve, reject) => {
    const abort = (): void => resolve(onAbort)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

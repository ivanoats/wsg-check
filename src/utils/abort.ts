/**
 * Abort helpers for work that takes no `AbortSignal` of its own.
 */

/**
 * Settles with `onAbort` (`undefined` if omitted) as soon as `signal` fires,
 * or at once if it already has; otherwise settles with `promise`. The underlying work is not cancelled; the
 * caller just stops waiting for it.
 */
export const raceAbort = <T, U = undefined>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  onAbort?: U
): Promise<T | U | undefined> => {
  if (!signal) return promise
  if (signal.aborted) return Promise.resolve(onAbort)
  return new Promise<T | U | undefined>((resolve, reject) => {
    const abort = (): void => resolve(onAbort)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

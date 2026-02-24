import { vi } from 'vitest'

/**
 * Minimal next/navigation manual mock for unit tests.
 * Activated by calling `vi.mock('next/navigation')` in any test file.
 */
export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}))

export const usePathname = vi.fn(() => '/')
export const useSearchParams = vi.fn(() => new URLSearchParams())

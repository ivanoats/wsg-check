import type { ComponentProps } from 'react'

/**
 * Minimal next/link manual mock for unit tests.
 * Activated by calling `vi.mock('next/link')` in any test file.
 */
const LinkMock = ({ href, children, ...props }: ComponentProps<'a'>) => (
  <a href={href} {...props}>
    {children}
  </a>
)

export default LinkMock

import { css } from 'styled-system/css'

interface SectionHeadingProps {
  readonly id: string
  readonly children: React.ReactNode
}

/** Shared section heading using Verdant's display-small typography token. */
export const SectionHeading = ({ id, children }: SectionHeadingProps) => (
  <h2
    id={id}
    className={css({
      fontSize: 'displaySm',
      lineHeight: 'displaySm',
      fontWeight: 'semibold',
      color: 'ink',
      mb: '3',
    })}
  >
    {children}
  </h2>
)

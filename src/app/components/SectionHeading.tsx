import { cx, css } from 'styled-system/css'
import { text } from 'styled-system/recipes'

interface SectionHeadingProps {
  readonly id: string
  readonly children: React.ReactNode
}

/** Shared section heading using Park UI text recipe — replaces repeated sectionHeadingClass css(). */
export const SectionHeading = ({ id, children }: SectionHeadingProps) => (
  <h2 id={id} className={cx(text({ variant: 'heading', size: 'lg' }), css({ mb: '3' }))}>
    {children}
  </h2>
)

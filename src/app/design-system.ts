import { css, cx } from 'styled-system/css'
import { button } from 'styled-system/recipes'

const touchTarget = css({ minH: '12' })

export const primaryButtonClass = cx(button({ variant: 'primary' }), touchTarget)
export const secondaryButtonClass = cx(button({ variant: 'secondary' }), touchTarget)

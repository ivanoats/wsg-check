/**
 * HTML/SVG attribute escaping utility shared by the HTML report formatter
 * and the visualization module.
 *
 * Centralising the function prevents the implementation from drifting if
 * the set of escaped characters ever needs to change.
 */

/** Escapes characters with special meaning in HTML/SVG to prevent XSS. */
export const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Ambient module declaration for `psl` (Public Suffix List).
 *
 * `psl` ships its own TypeScript types but its package.json `exports` field
 * does not include a `"types"` condition, so TypeScript with
 * `moduleResolution: "bundler"` cannot auto-resolve the declaration file.
 * This shim re-exposes the types that are already bundled with the package.
 */
declare module 'psl' {
  type ParsedDomain = {
    input: string
    tld: string | null
    sld: string | null
    domain: string | null
    subdomain: string | null
    listed: boolean
  }

  type ErrorResult = {
    input: string
    error: { code: string; message: string }
  }

  /** Parse a domain name and return its eTLD+1 components. */
  export function parse(input: string): ParsedDomain | ErrorResult

  /** Return the eTLD+1 for the given domain, or `null`. */
  export function get(domain: string): string | null

  /** Return `true` if the domain belongs to a known public suffix. */
  export function isValid(domain: string): boolean
}

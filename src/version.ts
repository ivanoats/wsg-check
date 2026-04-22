/**
 * Package version — single source of truth.
 *
 * tsup/esbuild resolves this import at build time so the version string in
 * every published bundle always matches the `version` field in package.json.
 */
import pkg from '../package.json'

export const VERSION = pkg.version

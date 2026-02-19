import { config } from 'dotenv'
import path from 'path'

/**
 * Load environment variables from .env files.
 *
 * Next.js handles `.env` loading automatically for the web app.
 * This loader is for non-Next.js contexts (CLI, API scripts, tests).
 *
 * Load order (later files override earlier ones):
 *   1. `.env`            — shared defaults
 *   2. `.env.local`      — local overrides (gitignored)
 *   3. `.env.{NODE_ENV}` — environment-specific
 */
export function loadEnv(): void {
  const root = path.resolve(import.meta.dirname ?? process.cwd(), '../../')
  const env = process.env.NODE_ENV ?? 'development'

  // Load in order: .env → .env.local → .env.{NODE_ENV}
  config({ path: path.join(root, '.env') })
  config({ path: path.join(root, '.env.local'), override: true })
  config({ path: path.join(root, `.env.${env}`), override: true })
}

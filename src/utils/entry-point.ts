import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Returns `true` when `scriptPath` (normally `process.argv[1]`) is the module
 * at `moduleUrl`. Both paths are resolved with `realpathSync`, because npm
 * installs the `wsg-check` bin as a symlink: `argv[1]` is the symlink, while
 * `import.meta.url` is the real file. Returns `false` when there is no script
 * path (e.g. `node --eval`) or either path cannot be resolved.
 */
export const isEntryPoint = (moduleUrl: string, scriptPath?: string): boolean => {
  if (scriptPath === undefined) return false
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(scriptPath)
  } catch {
    return false
  }
}

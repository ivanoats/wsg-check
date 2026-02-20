/**
 * Lightweight logger for wsg-check.
 *
 * Supports two output modes:
 *   - "structured"  – JSON lines (suitable for API / log aggregators)
 *   - "terminal"    – Human-readable prefixed lines (suitable for CLI output)
 *
 * Only messages at or above the configured minimum level are emitted.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Numeric weight so levels can be compared. */
const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/** A single structured log entry (used in "structured" mode). */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: unknown
}

export interface LoggerOptions {
  /** Minimum log level to emit. Defaults to `"info"`. */
  level?: LogLevel
  /**
   * When `true`, each line is emitted as JSON (`LogEntry`).
   * When `false` (default), a human-readable format is used.
   */
  structured?: boolean
}

export interface Logger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
}

/**
 * Create a new logger instance.
 *
 * @example
 * const log = createLogger({ level: 'debug', structured: false })
 * log.info('Fetching URL', { url: 'https://example.com' })
 */
export function createLogger(options?: LoggerOptions): Logger {
  const minWeight = LEVEL_WEIGHT[options?.level ?? 'info']
  const structured = options?.structured ?? false

  function emit(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_WEIGHT[level] < minWeight) return

    if (structured) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(data !== undefined ? { data } : {}),
      }
      console.log(JSON.stringify(entry))
    } else {
      const prefix = `[${level.toUpperCase()}]`
      if (data !== undefined) {
        console.log(`${prefix} ${message}`, data)
      } else {
        console.log(`${prefix} ${message}`)
      }
    }
  }

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data),
  }
}

/** A ready-to-use default logger (info level, terminal format). */
export const defaultLogger: Logger = createLogger()

/**
 * @fileoverview Error logging for the Adkit SDK.
 */

export type LogContext = {
  slotId?: string
  siteId?: string
  slot?: string
  [key: string]: unknown
}

export function logError(message: string, context: LogContext = {}): void {
  console.error(`[Adkit] ${message}`, context)
}

export function logWarn(message: string, context: LogContext = {}): void {
  console.warn(`[Adkit] ${message}`, context)
}

export function logInfo(message: string, context: LogContext = {}): void {
  console.info(`[Adkit] ${message}`, context)
}

export function captureException(error: unknown, context: LogContext = {}): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[Adkit] ${message}`, { ...context, error })
}

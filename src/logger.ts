/**
 * @fileoverview Error logging for the Adkit SDK.
 *
 * Captures errors and sends them to the logging endpoint without
 * breaking the host page. All logging is fire-and-forget.`
 */

import { ADKIT_VERSION } from "./constants"

const ADKIT_LOG_URL = "https://adkit.dev/api/sdk-logs"

export type LogLevel = "error" | "warn" | "info"

export type LogContext = {
  slotId?: string
  siteId?: string
  slot?: string
  url?: string
  [key: string]: unknown
}

type LogPayload = {
  level: LogLevel
  message: string
  context: LogContext
  sdkVersion: string
  userAgent: string
  url: string
  timestamp: number
}

let loggingEnabled = true

export function disableLogging(): void {
  loggingEnabled = false
}

export function enableLogging(): void {
  loggingEnabled = true
}

function getUrl(): string {
  try {
    return typeof window !== "undefined" ? window.location.href : ""
  } catch {
    return ""
  }
}

function getUserAgent(): string {
  try {
    return typeof navigator !== "undefined" ? navigator.userAgent : ""
  } catch {
    return ""
  }
}

function sendLog(payload: LogPayload): void {
  if (!loggingEnabled) return

  try {
    fetch(ADKIT_LOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {})
  } catch {
    // Never throw from logging
  }
}

function createPayload(level: LogLevel, message: string, context: LogContext = {}): LogPayload {
  return {
    level,
    message,
    context: {
      ...context,
      url: context.url ?? getUrl(),
    },
    sdkVersion: ADKIT_VERSION,
    userAgent: getUserAgent(),
    url: getUrl(),
    timestamp: Date.now(),
  }
}

export function logError(message: string, context: LogContext = {}): void {
  console.error(`[Adkit] ${message}`, context)
  sendLog(createPayload("error", message, context))
}

export function logWarn(message: string, context: LogContext = {}): void {
  console.warn(`[Adkit] ${message}`, context)
  sendLog(createPayload("warn", message, context))
}

export function logInfo(message: string, context: LogContext = {}): void {
  sendLog(createPayload("info", message, context))
}

export function captureException(error: unknown, context: LogContext = {}): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  logError(message, {
    ...context,
    stack,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  })
}

export function wrapWithErrorHandling<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context: LogContext = {}
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error, context)
          return undefined
        })
      }
      return result
    } catch (error) {
      captureException(error, context)
      return undefined
    }
  }) as T
}

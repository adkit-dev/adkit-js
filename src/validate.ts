/**
 * @fileoverview Slot configuration validation.
 *
 * This module validates slot configurations and warns about potential issues.
 * It performs both strict validation (which can reject slots) and soft
 * validation (which warns but allows the slot to render).
 *
 * ## Strict Validation
 * - Slot name format (alphanumeric, hyphens, underscores only)
 *
 * ## Soft Validation (Warnings Only)
 * - Aspect ratio deviation (container CSS may distort the slot)
 *
 * ## Philosophy
 * The SDK tries to be forgiving and render something rather than nothing.
 * Warnings help publishers fix issues without breaking their sites.
 */

import type { SlotConfig } from "./types"

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Regex for valid slot names.
 * Only allows letters, numbers, hyphens, and underscores.
 */
const SLOT_NAME_REGEX = /^[a-zA-Z0-9_-]+$/

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Validate a slot configuration.
 *
 * Performs both strict and soft validation. Strict validation failures
 * return false and prevent rendering. Soft validation issues log warnings
 * but still return true.
 *
 * @param config - Slot configuration to validate
 * @returns True if slot should be rendered, false if it should be skipped
 */
export function validateSlot(config: SlotConfig): boolean {
  let valid = true

  // ── Strict Validation ─────────────────────────────────────────────────────

  // Validate slot name format
  if (!SLOT_NAME_REGEX.test(config.slot)) {
    console.error(
      `[Adkit] Invalid slot name: "${config.slot}". Only letters, numbers, hyphens, and underscores are allowed.`
    )
    valid = false
  }

  // ── Soft Validation (Warnings) ────────────────────────────────────────────

  // Check if container CSS might distort the aspect ratio
  const computed = window.getComputedStyle(config.element)
  const width = parseFloat(computed.width)
  const height = parseFloat(computed.height)

  // Only check if element has measurable dimensions
  if (width > 0 && height > 0) {
    const actualRatio = width / height
    const expectedRatio = getExpectedRatio(config.aspectRatio)

    if (expectedRatio > 0) {
      // Allow 5% deviation before warning
      const deviation = Math.abs(actualRatio - expectedRatio) / expectedRatio
      if (deviation > 0.05) {
        console.warn(
          `[Adkit] Container CSS may distort aspect ratio. Expected ${config.aspectRatio}, but container ratio is ${actualRatio.toFixed(2)}.`
        )
      }
    }
  }

  return valid
}

// ============================================================================
// INTERNAL FUNCTIONS
// ============================================================================

/**
 * Get the expected numeric ratio for an aspect ratio string.
 *
 * @param aspectRatio - Aspect ratio string (e.g., "16:9")
 * @returns Numeric ratio (e.g., 1.778) or 0 if unknown
 */
function getExpectedRatio(aspectRatio: string): number {
  switch (aspectRatio) {
    case "16:9":
      return 16 / 9
    case "4:3":
      return 4 / 3
    case "1:1":
      return 1
    case "9:16":
      return 9 / 16
    case "banner":
      return 728 / 90
    default:
      return 0
  }
}

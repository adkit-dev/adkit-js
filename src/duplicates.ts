/**
 * @fileoverview Duplicate slot detection.
 *
 * This module tracks slot identities to detect when the same slot appears
 * multiple times on a page. Duplicate slots are a configuration error but
 * are still rendered to avoid breaking the page layout.
 *
 * ## Why Detect Duplicates?
 * Having two slots with the same siteId:slot identity causes issues:
 * - Analytics are skewed (same slot counted twice)
 * - Ad delivery is ambiguous (which slot should show the ad?)
 * - Publisher may not realize the misconfiguration
 *
 * ## Behavior
 * When a duplicate is detected:
 * 1. A warning is logged to console
 * 2. A slot_duplicate event is sent for analytics
 * 3. The slot is STILL rendered (to avoid breaking the page)
 */

import type { SlotConfig } from "./types"
import { sendDuplicateEvent } from "./events"
import { logWarn } from "./logger"

// ============================================================================
// MODULE STATE
// ============================================================================

/**
 * Set of slot identities that have been initialized.
 * Used to detect duplicates on subsequent initializations.
 */
const initializedIdentities = new Set<string>()

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if a slot identity has already been initialized.
 *
 * If the identity exists, logs a warning and sends a duplicate event.
 * The slot should still be rendered to avoid breaking the page.
 *
 * @param config - Slot configuration to check
 * @returns True if this is a duplicate, false if first occurrence
 *
 * @example
 * const isDuplicate = checkDuplicate(config)
 * if (isDuplicate) {
 *   // Still render, but be aware it's a duplicate
 * }
 */
export function checkDuplicate(config: SlotConfig): boolean {
  if (initializedIdentities.has(config.identity)) {
    logWarn(`Duplicate slot detected: ${config.identity}`, {
      slotId: config.identity,
      siteId: config.siteId,
      slot: config.slot,
    })
    sendDuplicateEvent(config)
    return true
  }

  initializedIdentities.add(config.identity)
  return false
}

/**
 * Reset duplicate tracking state.
 *
 * Called by refresh() to allow the same slots to be re-initialized
 * without triggering duplicate warnings.
 */
export function resetDuplicates(): void {
  initializedIdentities.clear()
}

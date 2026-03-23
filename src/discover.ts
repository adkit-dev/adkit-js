/**
 * @fileoverview DOM discovery and configuration parsing for ad slots.
 *
 * This module is responsible for finding ad slot elements in the DOM and
 * parsing their data attributes into typed configuration objects.
 *
 * ## Discovery Process
 * 1. Query all elements with [data-adkit-slot] attribute
 * 2. Skip elements already marked as initialized
 * 3. Parse and validate data attributes
 * 4. Mark element as initialized to prevent re-processing
 * 5. Return array of valid configurations
 *
 * ## Required Attributes
 * - data-adkit-site: Publisher's site ID
 * - data-adkit-slot: Unique slot name
 * - data-adkit-aspect-ratio: Aspect ratio (16:9, 4:3, 1:1, 9:16, banner)
 * - data-adkit-price: Daily price in cents (e.g., 2500 = $25/day)
 *
 * ## Optional Attributes
 * - data-adkit-size: Text size (sm, md, lg)
 * - data-adkit-theme: Color theme (light, dark, auto)
 * - data-adkit-silent: Disable analytics (true/false)
 * - data-adkit-bg-color: Custom background color
 * - data-adkit-text-color-primary: Custom primary text color
 * - data-adkit-text-color-secondary: Custom secondary text color
 * - data-adkit-border-color: Custom border color
 */

import type { AspectRatio, Size, SlotConfig, SlotStyles, Theme } from "./types"
import { DEFAULTS, VALID_ASPECT_RATIOS, VALID_SIZES, VALID_THEMES } from "./constants"
import { logError, logWarn } from "./logger"

// ============================================================================
// INITIALIZATION TRACKING
// ============================================================================

const initializedElements = new WeakSet<HTMLElement>()

export function resetInitializedElements(): void {
  // WeakSet doesn't have clear(), but we can create a new one via module reload
  // For refresh, we re-query elements and check if they're still in the set
}

export function markElementUninitialized(element: HTMLElement): void {
  initializedElements.delete(element)
}

export function isElementInitialized(element: HTMLElement): boolean {
  return initializedElements.has(element)
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Discover all uninitialized ad slots in the DOM.
 *
 * Scans the document for elements with [data-adkit-slot] that haven't been
 * processed yet. Tracks initialization in memory (WeakSet) to avoid
 * hydration mismatches with SSR frameworks.
 *
 * @returns Array of valid slot configurations
 */
export function discoverSlots(): SlotConfig[] {
  const elements = document.querySelectorAll<HTMLElement>("[data-adkit-slot]")
  const configs: SlotConfig[] = []

  for (const element of elements) {
    if (initializedElements.has(element)) continue

    const config = parseSlotConfig(element)
    if (config) {
      initializedElements.add(element)
      configs.push(config)
    }
  }

  return configs
}

// ============================================================================
// CONFIGURATION PARSING
// ============================================================================

/**
 * Parse slot configuration from an element's data attributes.
 *
 * Validates all required attributes and applies defaults for optional ones.
 * Logs errors for missing/invalid required attributes and warnings for
 * invalid optional attributes.
 *
 * @param element - DOM element with data-adkit-* attributes
 * @returns Parsed configuration or null if validation fails
 */
function parseSlotConfig(element: HTMLElement): SlotConfig | null {
  // Extract all data attributes
  const siteId = element.dataset.adkitSite
  const slot = element.dataset.adkitSlot
  const aspectRatioRaw = element.dataset.adkitAspectRatio
  const priceRaw = element.dataset.adkitPrice
  const sizeRaw = element.dataset.adkitSize
  const themeRaw = element.dataset.adkitTheme
  const silentRaw = element.dataset.adkitSilent

  // Custom styling attributes
  const bgColor = element.dataset.adkitBgColor
  const textColorPrimary = element.dataset.adkitTextColorPrimary
  const textColorSecondary = element.dataset.adkitTextColorSecondary
  const borderColor = element.dataset.adkitBorderColor

  if (!siteId) {
    logError("Missing required attribute: data-adkit-site", { element: element.outerHTML.slice(0, 200) })
    return null
  }

  if (!slot) {
    logError("Missing required attribute: data-adkit-slot", { siteId })
    return null
  }

  if (!/^[A-Za-z0-9_-]+$/.test(slot)) {
    logError(`Invalid slot name "${slot}"`, { siteId, slot, reason: "Only letters, numbers, hyphens, and underscores allowed" })
    return null
  }

  if (!aspectRatioRaw) {
    logError("Missing required attribute: data-adkit-aspect-ratio", { siteId, slot })
    return null
  }

  const aspectRatio = aspectRatioRaw as AspectRatio
  if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
    logError(`Invalid aspect ratio: "${aspectRatioRaw}"`, { siteId, slot, validOptions: VALID_ASPECT_RATIOS })
    return null
  }

  if (!priceRaw) {
    logError("Missing required attribute: data-adkit-price", { siteId, slot })
    return null
  }

  const price = parseInt(priceRaw, 10)
  if (isNaN(price) || price < 0) {
    logError(`Invalid price: "${priceRaw}"`, { siteId, slot, reason: "Must be a non-negative integer (cents)" })
    return null
  }

  // ── Parse Optional Attributes ─────────────────────────────────────────────

  const size = (sizeRaw as Size) || DEFAULTS.size
  if (sizeRaw && !VALID_SIZES.includes(size)) {
    logWarn(`Invalid size: "${sizeRaw}"`, { siteId, slot, validOptions: VALID_SIZES })
  }

  const theme = (themeRaw as Theme) || DEFAULTS.theme
  if (themeRaw && !VALID_THEMES.includes(theme)) {
    logWarn(`Invalid theme: "${themeRaw}"`, { siteId, slot, validOptions: VALID_THEMES })
  }

  // Silent mode (string "true" → boolean true)
  const silent = silentRaw === "true"

  // ── Build Custom Styles Object ────────────────────────────────────────────

  // Only create styles object if at least one custom style is provided
  const styles: SlotStyles | undefined = (bgColor || textColorPrimary || textColorSecondary || borderColor)
    ? {
        backgroundColor: bgColor,
        textColorPrimary,
        textColorSecondary,
        borderColor,
      }
    : undefined

  // ── Return Complete Configuration ─────────────────────────────────────────

  return {
    element,
    siteId,
    slot,
    aspectRatio,
    price,
    // serverPrice is set later when the API responds
    size: VALID_SIZES.includes(size) ? size : DEFAULTS.size,
    theme: VALID_THEMES.includes(theme) ? theme : DEFAULTS.theme,
    silent,
    // Identity combines siteId and slot for unique identification
    identity: `${siteId}:${slot}`,
    styles,
  }
}

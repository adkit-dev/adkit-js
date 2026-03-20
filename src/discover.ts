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
 *
 * ## Optional Attributes
 * - data-adkit-price: Loading-state price hint (cents)
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

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Discover all uninitialized ad slots in the DOM.
 *
 * Scans the document for elements with [data-adkit-slot] that haven't been
 * processed yet. Each valid slot is marked as initialized to prevent
 * duplicate processing by MutationObserver.
 *
 * @returns Array of valid slot configurations
 */
export function discoverSlots(): SlotConfig[] {
  const elements = document.querySelectorAll<HTMLElement>("[data-adkit-slot]")
  const configs: SlotConfig[] = []

  for (const element of elements) {
    // Skip already-initialized slots
    if (element.dataset.adkitInitialized === "true") continue

    // Parse configuration from data attributes
    const config = parseSlotConfig(element)
    if (config) {
      // Mark as initialized to prevent re-processing
      element.dataset.adkitInitialized = "true"
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

  // ── Validate Required Attributes ──────────────────────────────────────────

  if (!siteId) {
    console.error("[Adkit] Missing required attribute: data-adkit-site")
    return null
  }

  if (!slot) {
    console.error("[Adkit] Missing required attribute: data-adkit-slot")
    return null
  }

  // Validate slot name format (alphanumeric, hyphens, underscores only)
  if (!/^[A-Za-z0-9_-]+$/.test(slot)) {
    console.error(`[Adkit] Invalid slot name "${slot}". Only letters, numbers, hyphens, and underscores allowed.`)
    return null
  }

  if (!aspectRatioRaw) {
    console.error("[Adkit] Missing required attribute: data-adkit-aspect-ratio")
    return null
  }

  const aspectRatio = aspectRatioRaw as AspectRatio
  if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
    console.error(`[Adkit] Invalid aspect ratio: "${aspectRatioRaw}". Must be one of: ${VALID_ASPECT_RATIOS.join(", ")}`)
    return null
  }

  // ── Parse Optional Attributes ─────────────────────────────────────────────

  // Price is optional - only used as loading-state hint
  // Server response is the source of truth for actual pricing
  let price: number | undefined = undefined
  if (priceRaw) {
    const parsed = parseInt(priceRaw, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      price = parsed
    } else {
      console.warn(`[Adkit] Invalid price: "${priceRaw}". Ignoring.`)
    }
  }

  // Size with validation and fallback
  const size = (sizeRaw as Size) || DEFAULTS.size
  if (sizeRaw && !VALID_SIZES.includes(size)) {
    console.warn(`[Adkit] Invalid size: "${sizeRaw}". Using default: ${DEFAULTS.size}`)
  }

  // Theme with validation and fallback
  const theme = (themeRaw as Theme) || DEFAULTS.theme
  if (themeRaw && !VALID_THEMES.includes(theme)) {
    console.warn(`[Adkit] Invalid theme: "${themeRaw}". Using default: ${DEFAULTS.theme}`)
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

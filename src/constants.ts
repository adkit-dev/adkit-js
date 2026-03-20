/**
 * @fileoverview Constants and configuration values for the Adkit JS SDK.
 *
 * This file centralizes all magic numbers, API URLs, and default values
 * used throughout the SDK. Modify these values to configure SDK behavior.
 */

import type { AspectRatio, Size, Theme } from "./types"

// ============================================================================
// API ENDPOINTS
// ============================================================================

/** Base URL for fetching ad data */
export const ADKIT_SERVE_URL = "https://adkit.dev/api/serve"

/** Base URL for sending analytics events */
export const ADKIT_EVENTS_URL = "https://adkit.dev/api/events"

/** Base URL for the booking flow redirect */
export const ADKIT_BOOK_URL = "https://adkit.dev/book"

// ============================================================================
// SDK METADATA
// ============================================================================

/** Current SDK version (follows semver) */
export const ADKIT_VERSION = "1.0.0"

// ============================================================================
// ASPECT RATIO MAPPINGS
// ============================================================================

/**
 * CSS aspect-ratio values for each supported ratio.
 *
 * These are applied as CSS custom properties (--adkit-aspect) and used
 * with the `aspect-ratio` CSS property to enforce slot dimensions.
 */
export const ASPECT_RATIOS: Record<AspectRatio, string> = {
  "16:9": "16 / 9",
  "4:3": "4 / 3",
  "1:1": "1 / 1",
  "9:16": "9 / 16",
  banner: "728 / 90",
}

// ============================================================================
// VALIDATION ARRAYS
// ============================================================================

/** Valid aspect ratio values for input validation */
export const VALID_ASPECT_RATIOS: AspectRatio[] = ["16:9", "4:3", "1:1", "9:16", "banner"]

/** Valid size values for input validation */
export const VALID_SIZES: Size[] = ["sm", "md", "lg"]

/** Valid theme values for input validation */
export const VALID_THEMES: Theme[] = ["light", "dark", "auto"]

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default values for optional slot configuration.
 *
 * Note: price is intentionally NOT included here. If no price attribute
 * is provided, the slot shows no price during loading and relies entirely
 * on the server response for pricing.
 */
export const DEFAULTS = {
  /** Default text size preset */
  size: "lg" as const,
  /** Default color theme (auto-detects system preference) */
  theme: "auto" as const,
  /** Default analytics tracking state (enabled) */
  silent: false,
}

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

/**
 * Timeout for serve API fetch requests in milliseconds.
 *
 * If the API doesn't respond within this time, the request is aborted
 * and the slot falls back to placeholder rendering.
 */
export const FETCH_TIMEOUT_MS = 5000

/**
 * Debounce delay for MutationObserver callbacks in milliseconds.
 *
 * When the DOM changes rapidly (e.g., during SPA navigation), we wait
 * this long after the last mutation before scanning for new slots.
 * This prevents excessive processing during DOM churn.
 */
export const MUTATION_DEBOUNCE_MS = 100

/**
 * IntersectionObserver threshold for view tracking.
 *
 * A slot_view event fires when this percentage of the slot is visible
 * in the viewport. 0.5 = 50% visibility.
 */
export const INTERSECTION_THRESHOLD = 0.5

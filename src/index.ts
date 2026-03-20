/**
 * @fileoverview Main entry point for the Adkit JS SDK.
 *
 * This file handles SDK initialization, slot discovery, and the public API.
 * It coordinates all other modules to provide a seamless ad slot experience.
 *
 * ## Initialization Flow
 * 1. Wait for DOM to be ready (DOMContentLoaded if needed)
 * 2. Check idempotency (exit if already initialized)
 * 3. Inject CSS styles into document head
 * 4. Discover and initialize all existing slots
 * 5. Set up MutationObserver for dynamically added slots
 *
 * ## Public API
 * The SDK exposes a minimal API on `window.__adkit`:
 * - `version`: Current SDK version string
 * - `refresh()`: Re-scan DOM and re-initialize all slots
 */

import { ADKIT_VERSION, MUTATION_DEBOUNCE_MS } from "./constants"
import { discoverSlots } from "./discover"
import { checkDuplicate, resetDuplicates } from "./duplicates"
import { resetTracking, sendMountEvent } from "./events"
import { observeSlot } from "./observer"
import { renderLoading, renderSlot } from "./render"
import { fetchAd } from "./serve"
import { injectStyles } from "./styles"
import type { SlotConfig, ServeResponse } from "./types"
import { validateSlot } from "./validate"

// ============================================================================
// GLOBAL TYPE DECLARATION
// ============================================================================

/**
 * Extend the Window interface to include the Adkit SDK.
 * This allows TypeScript to recognize window.__adkit.
 */
declare global {
  interface Window {
    __adkit?: {
      version: string
      refresh: () => Promise<void>
    }
  }
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/**
 * Cache of slot states keyed by identity (siteId:slot).
 * Used to track which slots have been initialized and their API responses.
 */
const slotStates = new Map<string, { config: SlotConfig; response: ServeResponse | null }>()

// ============================================================================
// SLOT INITIALIZATION
// ============================================================================

/**
 * Initialize a single ad slot.
 *
 * This function handles the complete lifecycle of a slot:
 * 1. Check for duplicates (warn but still render)
 * 2. Validate configuration
 * 3. Render loading state immediately (prevents layout shift)
 * 4. Send mount event for analytics
 * 5. Fetch ad data from API
 * 6. Render final state (active ad or placeholder)
 * 7. Set up viewport observer for view tracking
 *
 * @param config - Parsed slot configuration
 */
async function initializeSlot(config: SlotConfig): Promise<void> {
  // Check for duplicate slot identities on the same page
  const isDuplicate = checkDuplicate(config)
  if (isDuplicate) {
    // Still render duplicates to avoid breaking the page layout
    // The duplicate event has already been sent by checkDuplicate()
  }

  // Validate slot configuration (logs errors for invalid configs)
  if (!validateSlot(config)) {
    return
  }

  // Render loading state immediately to reserve space and prevent layout shift
  renderLoading(config)

  // Send mount event (fires before API response for auto-slot-creation)
  sendMountEvent(config)

  // Fetch ad data from the serve API
  const response = await fetchAd(config)

  // Check if element was removed from DOM during fetch
  if (!config.element.isConnected) return

  // Cache the response for potential future use
  slotStates.set(config.identity, { config, response })

  // Render the final state (active ad or placeholder)
  renderSlot(config, response)

  // Set up IntersectionObserver for view tracking
  observeSlot(config, response)
}

/**
 * Discover and initialize all ad slots on the page.
 *
 * Slots are fetched in parallel using Promise.all for optimal performance.
 * This function is called on initial load and by the MutationObserver.
 */
async function initializeAllSlots(): Promise<void> {
  // Find all uninitialized slots in the DOM
  const configs = discoverSlots()

  if (configs.length === 0) return

  // Initialize all slots in parallel (API calls happen concurrently)
  await Promise.all(configs.map(initializeSlot))
}

// ============================================================================
// MUTATION OBSERVER
// ============================================================================

/** Timeout handle for debouncing mutation callbacks */
let mutationTimeout: ReturnType<typeof setTimeout> | null = null

/** MutationObserver instance for detecting dynamically added slots */
let mutationObserver: MutationObserver | null = null

/**
 * Set up MutationObserver to detect dynamically added slots.
 *
 * This is essential for SPA support where slots may be added after
 * initial page load. The observer watches for any DOM changes and
 * re-scans for new slots after a debounce period.
 */
function setupMutationObserver(): void {
  // Skip if MutationObserver is not available (old browsers)
  if (typeof MutationObserver === "undefined") return

  mutationObserver = new MutationObserver(() => {
    // Debounce: clear any pending timeout
    if (mutationTimeout) {
      clearTimeout(mutationTimeout)
    }

    // Wait for DOM churn to settle before scanning
    mutationTimeout = setTimeout(() => {
      initializeAllSlots()
    }, MUTATION_DEBOUNCE_MS)
  })

  // Watch the entire document body for changes
  mutationObserver.observe(document.body, {
    childList: true, // Watch for added/removed nodes
    subtree: true,   // Watch all descendants, not just direct children
  })
}

// ============================================================================
// SDK INITIALIZATION
// ============================================================================

/**
 * Initialize the Adkit SDK.
 *
 * This is the main entry point that sets up the SDK. It's designed to be
 * idempotent - calling it multiple times has no effect after the first call.
 */
async function init(): Promise<void> {
  // Idempotency check: exit if already initialized
  if (window.__adkit) return

  // Expose public API on window object
  window.__adkit = {
    version: ADKIT_VERSION,

    /**
     * Refresh all slots on the page.
     *
     * This clears all tracking state and re-initializes every slot.
     * Useful for SPA route changes or manual refresh triggers.
     */
    refresh: async () => {
      // Clear all tracking state
      resetTracking()
      resetDuplicates()
      slotStates.clear()

      // Remove initialized flag from all slots so they can be re-processed
      document.querySelectorAll<HTMLElement>("[data-adkit-slot]").forEach((el) => {
        delete el.dataset.adkitInitialized
      })

      // Re-discover and initialize all slots
      await initializeAllSlots()
    },
  }

  // Inject CSS styles (checks for existing styles to avoid duplicates)
  injectStyles()

  // Initialize all existing slots
  await initializeAllSlots()

  // Set up observer for dynamically added slots
  setupMutationObserver()
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Auto-initialize when the DOM is ready.
 *
 * If the script loads before the DOM is ready, we wait for DOMContentLoaded.
 * Otherwise, we initialize immediately.
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => init())
} else {
  init()
}

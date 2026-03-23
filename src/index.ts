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
import { captureException, logError, logInfo } from "./logger"
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

/** Flag to prevent concurrent initialization runs */
let isInitializing = false

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
  try {
    checkDuplicate(config)

    if (!validateSlot(config)) {
      return
    }

    renderLoading(config)
    sendMountEvent(config)

    const response = await fetchAd(config)

    if (!config.element.isConnected) return

    slotStates.set(config.identity, { config, response })
    renderSlot(config, response)
    observeSlot(config, response)
  } catch (error) {
    captureException(error, {
      slotId: config.identity,
      siteId: config.siteId,
      slot: config.slot,
      phase: "initializeSlot",
    })
  }
}

/**
 * Discover and initialize all ad slots on the page.
 *
 * Slots are fetched in parallel using Promise.all for optimal performance.
 * This function is called on initial load and by the MutationObserver.
 */
async function initializeAllSlots(): Promise<void> {
  if (isInitializing) return
  isInitializing = true

  try {
    const configs = discoverSlots()
    if (configs.length === 0) return
    await Promise.all(configs.map(initializeSlot))
  } catch (error) {
    captureException(error, { phase: "initializeAllSlots" })
  } finally {
    isInitializing = false
  }
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
  if (typeof MutationObserver === "undefined") return

  mutationObserver = new MutationObserver((mutations) => {
    if (isInitializing) return

    const isValidSlot = (el: HTMLElement): boolean => {
      return !!(
        el.dataset?.adkitSlot &&
        el.dataset?.adkitSite &&
        el.dataset?.adkitAspectRatio &&
        el.dataset?.adkitPrice &&
        el.dataset?.adkitInitialized !== "true"
      )
    }

    const hasNewSlot = mutations.some((mutation) => {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (isValidSlot(node)) return true
          const nested = node.querySelector?.<HTMLElement>(
            "[data-adkit-slot][data-adkit-site][data-adkit-aspect-ratio][data-adkit-price]:not([data-adkit-initialized='true'])"
          )
          if (nested) return true
        }
      }
      return false
    })

    if (!hasNewSlot) return

    if (mutationTimeout) {
      clearTimeout(mutationTimeout)
    }

    mutationTimeout = setTimeout(() => {
      initializeAllSlots()
    }, MUTATION_DEBOUNCE_MS)
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
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
  try {
    if (window.__adkit) return

    window.__adkit = {
      version: ADKIT_VERSION,

      refresh: async () => {
        try {
          resetTracking()
          resetDuplicates()
          slotStates.clear()

          document.querySelectorAll<HTMLElement>("[data-adkit-slot]").forEach((el) => {
            delete el.dataset.adkitInitialized
          })

          await initializeAllSlots()
        } catch (error) {
          captureException(error, { phase: "refresh" })
        }
      },
    }

    injectStyles()
    await initializeAllSlots()
    setupMutationObserver()

    logInfo("SDK initialized", { version: ADKIT_VERSION })
  } catch (error) {
    captureException(error, { phase: "init" })
  }
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

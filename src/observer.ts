/**
 * @fileoverview Viewport visibility tracking using IntersectionObserver.
 *
 * This module tracks when ad slots become visible in the viewport and
 * fires slot_view events at the appropriate threshold (50% visibility).
 *
 * ## How It Works
 * 1. When a slot is rendered, observeSlot() is called
 * 2. IntersectionObserver watches the slot element
 * 3. When 50% of the slot is visible, sendViewEvent() is called
 * 4. The slot is then unobserved (view event fires only once)
 *
 * ## Fallback Behavior
 * If IntersectionObserver is not available (old browsers), the view
 * event fires immediately when the slot is rendered.
 *
 * ## Why Track Placeholder Views?
 * View events fire for both active ads AND placeholders. This enables
 * fill rate calculation: (active views / total views) = fill rate.
 */

import type { ServeResponse, SlotConfig } from "./types"
import { INTERSECTION_THRESHOLD } from "./constants"
import { sendViewEvent } from "./events"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data stored for each observed element.
 * Used to retrieve config and response when the element becomes visible.
 */
type ObserverEntry = {
  config: SlotConfig
  response: ServeResponse | null
}

// ============================================================================
// MODULE STATE
// ============================================================================

/**
 * WeakMap linking observed elements to their slot data.
 * WeakMap allows garbage collection when elements are removed from DOM.
 */
const observerMap = new WeakMap<Element, ObserverEntry>()

/**
 * Shared IntersectionObserver instance.
 * Created lazily on first use and reused for all slots.
 */
let observer: IntersectionObserver | null = null

// ============================================================================
// OBSERVER MANAGEMENT
// ============================================================================

/**
 * Get or create the shared IntersectionObserver.
 *
 * Creates a single observer instance that's reused for all slots.
 * Returns null if IntersectionObserver is not available.
 *
 * @returns IntersectionObserver instance or null
 */
function getObserver(): IntersectionObserver | null {
  // Return existing observer if already created
  if (observer) return observer

  // Check if IntersectionObserver is available
  if (typeof IntersectionObserver === "undefined") {
    return null
  }

  // Create new observer with 50% visibility threshold
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // Check if element is visible at or above threshold
        if (entry.isIntersecting && entry.intersectionRatio >= INTERSECTION_THRESHOLD) {
          // Get stored slot data
          const data = observerMap.get(entry.target)
          if (data) {
            // Send view event
            sendViewEvent(data.config, data.response)

            // Stop observing (view event fires only once per page load)
            observer?.unobserve(entry.target)
            observerMap.delete(entry.target)
          }
        }
      }
    },
    { threshold: INTERSECTION_THRESHOLD }
  )

  return observer
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Start observing a slot for viewport visibility.
 *
 * When 50% of the slot becomes visible, a slot_view event is fired.
 * If IntersectionObserver is not available, the event fires immediately.
 *
 * @param config - Slot configuration
 * @param response - API response (passed to view event for bookingId)
 */
export function observeSlot(
  config: SlotConfig,
  response: ServeResponse | null
): void {
  const obs = getObserver()

  // Fallback: if no IntersectionObserver, fire view event immediately
  if (!obs) {
    sendViewEvent(config, response)
    return
  }

  // Store slot data for retrieval when element becomes visible
  observerMap.set(config.element, { config, response })

  // Start observing the element
  obs.observe(config.element)
}

/**
 * Stop observing a slot element.
 *
 * Called when a slot is removed from the DOM or re-initialized.
 *
 * @param element - DOM element to stop observing
 */
export function unobserveSlot(element: Element): void {
  observer?.unobserve(element)
  observerMap.delete(element)
}

/**
 * Disconnect the observer entirely.
 *
 * Stops observing all elements and cleans up the observer.
 * Useful for testing or complete SDK teardown.
 */
export function disconnectObserver(): void {
  observer?.disconnect()
  observer = null
}

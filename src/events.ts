/**
 * @fileoverview Analytics event tracking for ad slots.
 *
 * This module handles sending analytics events to the Adkit API. Events
 * track slot lifecycle (mount, view, click) and configuration issues
 * (duplicates).
 *
 * ## Event Types
 * - slot_mount: Slot initialized on page
 * - slot_view: Slot became 50% visible in viewport
 * - slot_click: Active ad was clicked
 * - slot_duplicate: Duplicate slot identity detected
 *
 * ## Event Delivery
 * - Primary: navigator.sendBeacon() (non-blocking, survives page unload)
 * - Fallback: fetch() with keepalive: true
 * - All errors are silently swallowed (never breaks the host page)
 *
 * ## Silent Mode
 * Events are skipped entirely if data-adkit-silent="true" is set on the slot.
 */

import type { AdkitEvent, SlotConfig, ServeResponse } from "./types"
import { ADKIT_EVENTS_URL } from "./constants"

// ============================================================================
// TRACKING STATE
// ============================================================================

/**
 * Set of slot identities that have already sent a view event.
 * Prevents duplicate view events for the same slot on the same page load.
 */
const viewedSlots = new Set<string>()

/**
 * Set of slot identities that have already sent a mount event.
 * Prevents duplicate mount events for the same slot on the same page load.
 */
const mountedSlots = new Set<string>()

// ============================================================================
// EVENT SENDING
// ============================================================================

/**
 * Send an analytics event to the Adkit API.
 *
 * Uses sendBeacon for reliable delivery (survives page unload).
 * Falls back to fetch with keepalive for browsers without sendBeacon.
 * All errors are silently swallowed to never break the host page.
 *
 * @param event - Event payload to send
 */
export function sendEvent(event: AdkitEvent): void {
  try {
    const payload = JSON.stringify(event)
    const blob = new Blob([payload], { type: "text/plain" })

    // Prefer sendBeacon for reliability (non-blocking, survives unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ADKIT_EVENTS_URL, blob)
    } else {
      // Fallback to fetch with keepalive
      fetch(ADKIT_EVENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: payload,
        keepalive: true,
        credentials: "omit",
      }).catch(() => {})
    }
  } catch {
    // Never throw from SDK - silently swallow all errors
  }
}

// ============================================================================
// EVENT FUNCTIONS
// ============================================================================

/**
 * Send a slot_mount event.
 *
 * Fires when a slot is first initialized on the page. This happens before
 * the serve API responds. The price (if included) comes from the data
 * attribute and is used by the backend to set or update the slot's price:
 * - New slots: created at this price, immediately bookable
 * - Price increases: applied immediately
 * - Price decreases: require publisher confirmation
 *
 * @param config - Slot configuration
 */
export function sendMountEvent(config: SlotConfig): void {
  // Skip if silent mode is enabled
  if (config.silent) return

  // Skip if already mounted (prevents duplicate events)
  if (mountedSlots.has(config.identity)) return

  mountedSlots.add(config.identity)

  // Build event payload
  const event: AdkitEvent = {
    type: "slot_mount",
    siteId: config.siteId,
    slot: config.slot,
    pathname: typeof window !== "undefined" ? window.location.pathname : "",
    aspectRatio: config.aspectRatio,
    timestamp: Date.now(),
  }

  // Only include price if data attribute was provided
  // Backend uses this to set/update slot price (increases immediate, decreases need confirmation)
  if (config.price !== undefined) {
    (event as any).price = config.price
  }

  sendEvent(event)
}

/**
 * Send a slot_view event.
 *
 * Fires when 50% of the slot becomes visible in the viewport.
 * Fires for BOTH active ads AND placeholders (needed for fill rate calculation).
 * The bookingId is only present for active ads.
 *
 * @param config - Slot configuration
 * @param response - API response (used to get bookingId for active ads)
 */
export function sendViewEvent(
  config: SlotConfig,
  response: ServeResponse | null
): void {
  // Skip if silent mode is enabled
  if (config.silent) return

  // Skip if already viewed (prevents duplicate events)
  if (viewedSlots.has(config.identity)) return

  viewedSlots.add(config.identity)

  // Get bookingId only for active ads
  const bookingId =
    response?.status === "active" ? response.bookingId : undefined

  sendEvent({
    type: "slot_view",
    slotId: config.identity,
    bookingId,
    pathname: window.location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: Date.now(),
  })
}

/**
 * Send a slot_click event.
 *
 * Fires when an active ad is clicked. Does not fire for placeholder clicks
 * (which open the booking modal instead).
 *
 * @param config - Slot configuration
 * @param response - API response (used to get bookingId)
 */
export function sendClickEvent(
  config: SlotConfig,
  response: ServeResponse | null
): void {
  // Skip if silent mode is enabled
  if (config.silent) return

  // Get bookingId only for active ads
  const bookingId =
    response?.status === "active" ? response.bookingId : undefined

  sendEvent({
    type: "slot_click",
    slotId: config.identity,
    bookingId,
    pathname: window.location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: Date.now(),
  })
}

/**
 * Send a slot_duplicate event.
 *
 * Fires when a duplicate slot identity is detected on the same page.
 * This indicates a configuration error by the publisher.
 *
 * @param config - Slot configuration of the duplicate
 */
export function sendDuplicateEvent(config: SlotConfig): void {
  // Skip if silent mode is enabled
  if (config.silent) return

  sendEvent({
    type: "slot_duplicate",
    siteId: config.siteId,
    slot: config.slot,
    pathname: window.location.pathname,
    timestamp: Date.now(),
  })
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Reset all tracking state.
 *
 * Called by refresh() to allow events to fire again for the same slots.
 * This is necessary for SPA navigation where slots may be re-initialized.
 */
export function resetTracking(): void {
  viewedSlots.clear()
  mountedSlots.clear()
}

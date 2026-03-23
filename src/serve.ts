/**
 * @fileoverview API client for fetching ad data from the Adkit serve endpoint.
 *
 * This module handles all communication with the /api/serve endpoint, which
 * returns either an active ad to display or an empty status with pricing info.
 *
 * ## Key Behaviors
 * - 5-second timeout using AbortController
 * - Graceful error handling (never throws, returns empty status)
 * - No retry logic (fail fast to placeholder)
 * - Parallel fetching support via fetchAds()
 *
 * ## Server-Authoritative Pricing
 * The serve API is the single source of truth for slot data. When the API
 * returns status: "empty", it includes the server-authoritative price that
 * should be displayed in the placeholder and modal.
 */

import type { ServeResponse, SlotConfig } from "./types"
import { ADKIT_SERVE_URL, FETCH_TIMEOUT_MS } from "./constants"
import { logError } from "./logger"

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch ad data for a single slot.
 *
 * Makes a GET request to the serve API with the slot identity. Uses
 * AbortController for timeout handling. On any error (network, timeout,
 * non-200 response), returns an empty status to trigger placeholder rendering.
 *
 * @param config - Slot configuration containing the identity
 * @returns Promise resolving to the serve response (never rejects)
 *
 * @example
 * const response = await fetchAd(config)
 * if (response.status === "active") {
 *   // Render the ad image
 * } else {
 *   // Render placeholder with response.price
 * }
 */
export async function fetchAd(config: SlotConfig): Promise<ServeResponse> {
  // Set up timeout using AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    // Build the request URL with encoded slot identity
    const url = `${ADKIT_SERVE_URL}?slotId=${encodeURIComponent(config.identity)}`

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })

    // Clear timeout since we got a response
    clearTimeout(timeoutId)

    if (!response.ok) {
      logError("Serve API returned non-200", {
        slotId: config.identity,
        siteId: config.siteId,
        slot: config.slot,
        status: response.status,
      })
      return { status: "empty" }
    }

    const data = await response.json()
    return data as ServeResponse
  } catch (error) {
    clearTimeout(timeoutId)

    const isTimeout = error instanceof DOMException && error.name === "AbortError"
    logError(isTimeout ? "Serve API timeout" : "Serve API fetch failed", {
      slotId: config.identity,
      siteId: config.siteId,
      slot: config.slot,
      error: error instanceof Error ? error.message : String(error),
    })

    return { status: "empty" }
  }
}

/**
 * Fetch ad data for multiple slots in parallel.
 *
 * Uses Promise.all to fetch all slots concurrently for optimal performance.
 * Results are returned as a Map keyed by slot identity.
 *
 * @param configs - Array of slot configurations
 * @returns Promise resolving to Map of identity → response
 *
 * @example
 * const results = await fetchAds(configs)
 * for (const config of configs) {
 *   const response = results.get(config.identity)
 *   renderSlot(config, response)
 * }
 */
export async function fetchAds(
  configs: SlotConfig[]
): Promise<Map<string, ServeResponse>> {
  const results = new Map<string, ServeResponse>()

  // Create array of fetch promises
  const promises = configs.map(async (config) => {
    const response = await fetchAd(config)
    results.set(config.identity, response)
  })

  // Wait for all fetches to complete
  await Promise.all(promises)

  return results
}

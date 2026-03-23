/**
 * @fileoverview DOM rendering for ad slots.
 *
 * This module handles all visual rendering of ad slots, including:
 * - Loading state (shown while fetching)
 * - Active ad state (clickable image)
 * - Placeholder state (booking CTA)
 *
 * ## Rendering States
 * 1. Loading: Aspect-ratio-locked container with optional price hint
 * 2. Active: Clickable image linking to advertiser's URL
 * 3. Placeholder: Booking CTA with server-authoritative price
 *
 * ## Server-Authoritative Pricing
 * The placeholder displays the price from the server response (serverPrice),
 * NOT the data attribute (price). The data attribute is only used during
 * the loading state as a hint before the server responds.
 *
 * ## Theme Support
 * Slots support light, dark, and auto themes. Auto theme listens to the
 * system's prefers-color-scheme and updates dynamically.
 */

import type { ServeResponse, SlotConfig, Theme, SlotStyles } from "./types"
import { ASPECT_RATIOS } from "./constants"
import { sendClickEvent } from "./events"
import { openModal } from "./modal"

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Render a slot based on the API response.
 *
 * This is the main rendering function called after the serve API responds.
 * It determines whether to show an active ad or placeholder based on the
 * response status.
 *
 * @param config - Slot configuration
 * @param response - API response (active ad or empty)
 */
export function renderSlot(
  config: SlotConfig,
  response: ServeResponse
): void {
  // Safety check: don't render if element was removed from DOM
  if (!config.element.isConnected) return

  // Store server price on config for use in placeholder and modal
  // This is the source of truth for pricing, not the data attribute
  if (response.status === "empty" && response.price !== undefined) {
    config.serverPrice = response.price
  }

  // Preserve any existing classes on the container element
  const existingClasses = config.element.className

  // Clear previous content
  config.element.innerHTML = ""

  // Render appropriate state
  if (response.status === "active") {
    renderActiveAd(config, response, existingClasses)
  } else {
    renderPlaceholder(config, existingClasses)
  }
}

/**
 * Render the loading state for a slot.
 *
 * Called immediately after slot discovery, before the API responds.
 * Shows an aspect-ratio-locked container to prevent layout shift.
 * If a price hint is provided via data attribute, it's shown during loading.
 *
 * @param config - Slot configuration
 */
export function renderLoading(config: SlotConfig): void {
  const slot = document.createElement("div")
  slot.className = "adkit-slot adkit-slot--default-width"
  slot.dataset.adkitSize = config.size
  slot.dataset.adkitRatio = config.aspectRatio

  // Apply CSS custom properties for styling
  applyStyleVars(slot, config)

  const canvas = document.createElement("div")
  canvas.className = "adkit-canvas"

  // Show price hint if data attribute was provided
  if (config.price !== undefined) {
    const box = document.createElement("div")
    box.className = "adkit-box"

    const content = document.createElement("div")
    content.className = "adkit-content"

    const label = document.createElement("div")
    label.className = "adkit-label"
    label.textContent = "ad space"

    const price = document.createElement("div")
    price.className = "adkit-price"
    price.textContent = `$${formatPrice(config.price)}/day`

    content.appendChild(label)
    content.appendChild(price)
    box.appendChild(content)
    canvas.appendChild(box)
  } else {
    // No price hint - show minimal loading state
    const box = document.createElement("div")
    box.className = "adkit-box"

    const content = document.createElement("div")
    content.className = "adkit-content"

    const label = document.createElement("div")
    label.className = "adkit-label"
    label.textContent = "ad space"

    content.appendChild(label)
    box.appendChild(content)
    canvas.appendChild(box)
  }

  slot.appendChild(canvas)
  config.element.innerHTML = ""
  config.element.appendChild(slot)
}

// ============================================================================
// ACTIVE AD RENDERING
// ============================================================================

/**
 * Render an active ad (clickable image).
 *
 * Creates a linked image that tracks clicks and opens in a new tab.
 * Includes an onerror handler to fall back to placeholder if the
 * image fails to load.
 *
 * @param config - Slot configuration
 * @param response - Active ad response with image and link URLs
 * @param existingClasses - CSS classes from the original container
 */
function renderActiveAd(
  config: SlotConfig,
  response: Extract<ServeResponse, { status: "active" }>,
  existingClasses: string
): void {
  // Create slot container
  const slot = document.createElement("div")
  slot.className = `adkit-slot adkit-slot--default-width ${existingClasses}`.trim()
  slot.dataset.adkitRatio = config.aspectRatio
  slot.dataset.adkitSize = config.size

  applyStyleVars(slot, config)

  // Create canvas for aspect ratio enforcement
  const canvas = document.createElement("div")
  canvas.className = "adkit-canvas"

  // Create clickable link
  const link = document.createElement("a")
  link.id = config.slot
  link.href = response.linkUrl
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.style.display = "block"
  link.style.width = "100%"
  link.style.height = "100%"

  // Track clicks
  link.addEventListener("click", () => {
    sendClickEvent(config, response)
  })

  // Create ad image
  const img = document.createElement("img")
  img.src = response.imageUrl
  img.alt = ""
  img.style.display = "block"
  img.style.width = "100%"
  img.style.height = "100%"
  img.style.objectFit = "contain"

  // Fall back to placeholder if image fails to load
  // This prevents broken image icons from appearing on the publisher's site
  img.onerror = () => {
    renderPlaceholder(config, existingClasses)
  }

  // Assemble DOM structure
  link.appendChild(img)
  canvas.appendChild(link)
  slot.appendChild(canvas)
  config.element.appendChild(slot)

  // Set up theme listener for auto theme
  if (config.theme === "auto") {
    setupThemeListener(slot, config)
  }
}

// ============================================================================
// PLACEHOLDER RENDERING
// ============================================================================

/**
 * Render a placeholder (booking CTA).
 *
 * Shows when no active ad is booked. Displays the server-authoritative
 * price (if available) and a CTA that opens the booking modal.
 *
 * @param config - Slot configuration (with serverPrice set if available)
 * @param existingClasses - CSS classes from the original container
 */
function renderPlaceholder(config: SlotConfig, existingClasses: string): void {
  // Use server price if available, fall back to data attribute price
  // Server price is the source of truth for actual pricing
  const displayPrice = config.serverPrice ?? config.price
  const hasPrice = displayPrice !== undefined

  // Create slot container
  const slot = document.createElement("div")
  slot.className = `adkit-slot adkit-slot--default-width ${existingClasses}`.trim()
  slot.dataset.adkitRatio = config.aspectRatio
  slot.dataset.adkitSize = config.size

  applyStyleVars(slot, config)

  // Create canvas for aspect ratio enforcement
  const canvas = document.createElement("div")
  canvas.className = "adkit-canvas"

  // Create interactive box
  const box = document.createElement("div")
  box.id = `${config.slot}-placeholder`
  box.className = "adkit-box"
  box.setAttribute("role", "button")
  box.setAttribute("tabindex", "0")

  // Create content container
  const content = document.createElement("div")
  content.className = "adkit-content"

  // Label text
  const label = document.createElement("div")
  label.className = "adkit-label"
  label.textContent = "Your ad here"

  // Add price if available
  if (hasPrice) {
    const price = document.createElement("div")
    price.className = "adkit-price"
    price.textContent = `$${formatPrice(displayPrice)}/day`
    content.appendChild(label)
    content.appendChild(price)
  } else {
    content.appendChild(label)
  }

  // CTA button
  const cta = document.createElement("div")
  cta.className = "adkit-cta"

  // CTA text varies by aspect ratio and price availability
  const isBanner = config.aspectRatio === "banner"
  const ctaText = document.createTextNode(
    hasPrice ? (isBanner ? "Rent" : "Rent this spot") : (isBanner ? "Learn more" : "Learn more")
  )
  cta.appendChild(ctaText)

  // Arrow indicator
  const arrow = document.createElement("span")
  arrow.className = "adkit-arrow"
  arrow.textContent = "→"
  cta.appendChild(arrow)

  content.appendChild(cta)
  box.appendChild(content)
  canvas.appendChild(box)
  slot.appendChild(canvas)

  // Open booking modal on click
  box.addEventListener("click", () => {
    openModal(config)
  })

  config.element.appendChild(slot)

  // Set up theme listener for auto theme
  if (config.theme === "auto") {
    setupThemeListener(slot, config)
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a price in cents as a display string.
 *
 * @param cents - Price in cents (e.g., 2500 = $25.00)
 * @returns Formatted string (e.g., "25" or "24.99")
 */
function formatPrice(cents: number): string {
  const dollars = cents / 100
  // Omit decimals for whole dollar amounts
  if (Number.isInteger(dollars)) {
    return dollars.toLocaleString()
  }
  return dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ============================================================================
// THEME HANDLING
// ============================================================================

/** Cached system dark mode preference */
let systemDarkCached: boolean | null = null

/**
 * Get the system's dark mode preference.
 *
 * Caches the result and sets up a listener for changes.
 * This allows auto theme to respond to system preference changes.
 *
 * @returns True if system prefers dark mode
 */
function getSystemDark(): boolean {
  if (systemDarkCached === null) {
    systemDarkCached = false
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      systemDarkCached = mq.matches
      // Listen for changes
      mq.addEventListener("change", (e) => {
        systemDarkCached = e.matches
      })
    }
  }
  return systemDarkCached
}

/**
 * Resolve a theme setting to a boolean dark mode flag.
 *
 * @param theme - Theme setting (light, dark, or auto)
 * @returns True if dark mode should be used
 */
function resolveTheme(theme: Theme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return getSystemDark()
}

/**
 * Apply CSS custom properties for styling.
 *
 * Sets CSS variables on the slot element for colors, aspect ratio, etc.
 * These variables are consumed by the CSS rules in styles.ts.
 *
 * @param slot - Slot DOM element
 * @param config - Slot configuration with theme and custom styles
 */
function applyStyleVars(slot: HTMLElement, config: SlotConfig): void {
  const isDark = resolveTheme(config.theme)
  const styles = config.styles

  // Set aspect ratio
  slot.style.setProperty("--adkit-aspect", ASPECT_RATIOS[config.aspectRatio])

  // Set background color
  slot.style.setProperty("--adkit-bg", styles?.backgroundColor ?? "transparent")

  // Set text colors based on theme or custom values
  slot.style.setProperty("--adkit-text-muted", styles?.textColorSecondary ?? (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"))
  slot.style.setProperty("--adkit-text", styles?.textColorSecondary ?? (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"))
  slot.style.setProperty("--adkit-text-strong", styles?.textColorPrimary ?? (isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)"))

  // Set border colors
  // Custom border colors use color-mix() for opacity (requires modern browsers)
  if (styles?.borderColor) {
    slot.style.setProperty("--adkit-border", `color-mix(in srgb, ${styles.borderColor} 40%, transparent)`)
    slot.style.setProperty("--adkit-border-hover", `color-mix(in srgb, ${styles.borderColor} 60%, transparent)`)
  } else {
    slot.style.setProperty("--adkit-border", isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.1)")
    slot.style.setProperty("--adkit-border-hover", isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.2)")
  }
}

/**
 * Set up a listener for system theme changes.
 *
 * When the system's color scheme preference changes, this updates
 * the slot's CSS variables to match.
 *
 * @param slot - Slot DOM element
 * @param config - Slot configuration
 */
function setupThemeListener(slot: HTMLElement, config: SlotConfig): void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

  const updateTheme = () => {
    applyStyleVars(slot, config)
  }

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", updateTheme)
  } else if (mediaQuery.addListener) {
    // Legacy Safari support
    mediaQuery.addListener(updateTheme)
  }
}

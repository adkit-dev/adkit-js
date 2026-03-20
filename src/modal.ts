/**
 * @fileoverview Booking modal for ad slot placeholders.
 *
 * This module creates and manages the modal that appears when a user clicks
 * on a placeholder. The modal displays pricing information and a CTA that
 * redirects to the Adkit booking flow.
 *
 * ## Modal Features
 * - Displays server-authoritative price (not data attribute)
 * - Accessible (ARIA attributes, keyboard navigation)
 * - Closes on Escape key or backdrop click
 * - Locks body scroll while open
 * - Animated entrance (fade + slide)
 *
 * ## Booking URL
 * The CTA redirects to:
 * https://adkit.dev/book?siteId={siteId}&slot={slot}&ref={currentUrl}
 *
 * Note: The price is NOT included in the URL. The booking page fetches
 * the price from the database server-side to prevent manipulation.
 */

import type { SlotConfig } from "./types"
import { ADKIT_BOOK_URL } from "./constants"

// ============================================================================
// MODULE STATE
// ============================================================================

/** Reference to the currently open modal (null if none) */
let currentModal: HTMLElement | null = null

/** Stored body overflow value to restore when modal closes */
let previousOverflow: string = ""

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Open the booking modal for a slot.
 *
 * Creates and displays a modal with pricing information and booking CTA.
 * If a modal is already open, it's closed first.
 *
 * @param config - Slot configuration (must have serverPrice set for pricing)
 */
export function openModal(config: SlotConfig): void {
  // Close any existing modal first
  if (currentModal) {
    closeModal()
  }

  // ── Determine Price to Display ────────────────────────────────────────────
  // Use server price (source of truth), fall back to data attribute
  const displayPrice = config.serverPrice ?? config.price
  const hasPrice = displayPrice !== undefined

  // Format price for display
  let priceFormatted = ""
  if (hasPrice) {
    const dollars = displayPrice / 100
    priceFormatted = Number.isInteger(dollars)
      ? `$${dollars}`
      : `$${dollars.toFixed(2)}`
  }

  // ── Create Modal Structure ────────────────────────────────────────────────

  // Overlay (backdrop)
  const overlay = document.createElement("div")
  overlay.className = "adkit-modal-overlay"
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-modal", "true")
  overlay.setAttribute("aria-label", "Book this ad space")

  // Card (content container)
  const card = document.createElement("div")
  card.className = "adkit-modal-card"

  // Headline
  const headline = document.createElement("h2")
  headline.className = "adkit-modal-headline"
  headline.textContent = `Advertise directly on ${window.location.hostname}.`

  // Subhead
  const subhead = document.createElement("p")
  subhead.className = "adkit-modal-subhead"
  subhead.textContent = "Rent this ad space for a fixed price. Your ad will be reviewed by the site owner before going live."

  // Feature bullets
  const bullets = document.createElement("ul")
  bullets.className = "adkit-modal-bullets"
  bullets.innerHTML = `
    <li>Exclusive placement, no other ads will be shown</li>
    <li>Fixed price — no bidding, auctions, or fees</li>
    <li>See your ad before you pay, no commitments</li>
    <li>Track your ad's performance on your dashboard</li>
    <li>Guaranteed to display 24/7 or your money back</li>
  `

  // Assemble header section
  card.appendChild(headline)
  card.appendChild(subhead)
  card.appendChild(bullets)

  // ── Price Section (only if price available) ───────────────────────────────
  if (hasPrice) {
    const priceSection = document.createElement("div")
    priceSection.className = "adkit-modal-price-section"

    const price = document.createElement("span")
    price.className = "adkit-modal-price"
    price.textContent = `${priceFormatted} / day`

    const priceHelper = document.createElement("span")
    priceHelper.className = "adkit-modal-price-helper"
    priceHelper.textContent = "Zero commitment. No minimum booking period."

    priceSection.appendChild(price)
    priceSection.appendChild(priceHelper)
    card.appendChild(priceSection)
  }

  // ── Actions Section ───────────────────────────────────────────────────────

  const actions = document.createElement("div")
  actions.className = "adkit-modal-actions"

  // CTA button
  const ctaButton = document.createElement("button")
  ctaButton.className = "adkit-modal-cta"
  ctaButton.textContent = "Book this ad"
  ctaButton.addEventListener("click", () => {
    // Redirect to booking page (price is fetched server-side)
    window.location.href = buildBookUrl(config)
  })

  // Redirect hint
  const redirectHint = document.createElement("span")
  redirectHint.className = "adkit-modal-redirect-hint"
  redirectHint.textContent = "You'll be redirected to Adkit to upload your ad and choose dates."

  // Cancel button
  const cancelButton = document.createElement("button")
  cancelButton.className = "adkit-modal-cancel"
  cancelButton.textContent = "Cancel"
  cancelButton.addEventListener("click", closeModal)

  actions.appendChild(ctaButton)
  actions.appendChild(redirectHint)
  actions.appendChild(cancelButton)

  // ── Footer ────────────────────────────────────────────────────────────────

  const footer = document.createElement("div")
  footer.className = "adkit-modal-footer"
  footer.innerHTML = `Powered by <a href="https://adkit.dev" target="_blank" rel="noopener noreferrer">Adkit</a>`

  // Assemble card
  card.appendChild(actions)
  card.appendChild(footer)
  overlay.appendChild(card)

  // ── Event Handlers ────────────────────────────────────────────────────────

  // Close on backdrop click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  })

  // Close on Escape key
  document.addEventListener("keydown", handleEscape)

  // ── Show Modal ────────────────────────────────────────────────────────────

  // Lock body scroll
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = "hidden"

  // Add to DOM
  document.body.appendChild(overlay)
  currentModal = overlay
}

/**
 * Close the currently open modal.
 *
 * Removes the modal from the DOM and restores body scroll.
 * Safe to call even if no modal is open.
 */
export function closeModal(): void {
  if (!currentModal) return

  // Remove event listeners
  document.removeEventListener("keydown", handleEscape)

  // Restore body scroll
  document.body.style.overflow = previousOverflow

  // Remove from DOM
  currentModal.remove()
  currentModal = null
}

// ============================================================================
// INTERNAL FUNCTIONS
// ============================================================================

/**
 * Handle Escape key press to close modal.
 *
 * @param e - Keyboard event
 */
function handleEscape(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    closeModal()
  }
}

/**
 * Build the booking URL for redirect.
 *
 * Creates a URL to the Adkit booking page with slot identification
 * and a referrer for returning to the publisher's site.
 *
 * Note: Price is NOT included in the URL. The booking page fetches
 * the price from the database to prevent URL manipulation.
 *
 * @param config - Slot configuration
 * @returns Full booking URL
 */
function buildBookUrl(config: SlotConfig): string {
  const params = new URLSearchParams({
    siteId: config.siteId,
    slot: config.slot,
    ref: window.location.href,
  })
  return `${ADKIT_BOOK_URL}?${params.toString()}`
}

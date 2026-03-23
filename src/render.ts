/**
 * @fileoverview DOM rendering for ad slots.
 *
 * Renders slots in three states:
 * - Loading: Shows "ad space" with optional price hint
 * - Active: Clickable ad image linking to advertiser URL
 * - Empty/Placeholder: Booking CTA with server-authoritative price
 */

import type { ServeResponse, SlotConfig, Theme } from "./types"
import { ASPECT_RATIOS } from "./constants"
import { sendClickEvent } from "./events"
import { openModal } from "./modal"
import { logError } from "./logger"

// ============================================================================
// THEME HANDLING
// ============================================================================

let systemDarkCached: boolean | null = null

function getSystemDark(): boolean {
  if (systemDarkCached === null) {
    systemDarkCached = false
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      systemDarkCached = mq.matches
      mq.addEventListener("change", (e) => {
        systemDarkCached = e.matches
      })
    }
  }
  return systemDarkCached
}

function resolveTheme(theme: Theme): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return getSystemDark()
}

// ============================================================================
// STYLE UTILITIES
// ============================================================================

function applyStyleVars(el: HTMLElement, config: SlotConfig): void {
  const isDark = resolveTheme(config.theme)
  const styles = config.styles

  el.style.setProperty("--adkit-aspect", ASPECT_RATIOS[config.aspectRatio])
  el.style.setProperty("--adkit-bg", styles?.backgroundColor ?? "transparent")
  el.style.setProperty("--adkit-text-muted", styles?.textColorSecondary ?? (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"))
  el.style.setProperty("--adkit-text", styles?.textColorSecondary ?? (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"))
  el.style.setProperty("--adkit-text-strong", styles?.textColorPrimary ?? (isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)"))

  if (styles?.borderColor) {
    el.style.setProperty("--adkit-border", `color-mix(in srgb, ${styles.borderColor} 40%, transparent)`)
    el.style.setProperty("--adkit-border-hover", `color-mix(in srgb, ${styles.borderColor} 60%, transparent)`)
  } else {
    el.style.setProperty("--adkit-border", isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.1)")
    el.style.setProperty("--adkit-border-hover", isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.2)")
  }
}

function formatPrice(cents: number): string {
  const dollars = cents / 100
  if (Number.isInteger(dollars)) {
    return dollars.toLocaleString()
  }
  return dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function setupThemeListener(slot: HTMLElement, config: SlotConfig): void {
  if (typeof window === "undefined" || !window.matchMedia) return
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const updateTheme = () => applyStyleVars(slot, config)
  mediaQuery.addEventListener("change", updateTheme)
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

/**
 * Render loading state (shown while fetching).
 */
export function renderLoading(config: SlotConfig): void {
  const container = config.element
  container.innerHTML = ""

  const slot = document.createElement("div")
  slot.className = "adkit-slot adkit-slot--default-width"
  slot.dataset.adkitRatio = config.aspectRatio
  slot.dataset.adkitSize = config.size
  applyStyleVars(slot, config)

  const canvas = document.createElement("div")
  canvas.className = "adkit-canvas"

  const box = document.createElement("div")
  box.className = "adkit-box"
  box.style.cursor = "default"

  const content = document.createElement("div")
  content.className = "adkit-content"

  const label = document.createElement("div")
  label.className = "adkit-label"
  label.textContent = "ad space"
  content.appendChild(label)

  if (config.price !== undefined) {
    const price = document.createElement("div")
    price.className = "adkit-price"
    price.textContent = `$${formatPrice(config.price)}/day`
    content.appendChild(price)
  }

  box.appendChild(content)
  canvas.appendChild(box)
  slot.appendChild(canvas)
  container.appendChild(slot)

  if (config.theme === "auto") {
    setupThemeListener(slot, config)
  }
}

/**
 * Render slot based on API response (active ad or placeholder).
 */
export function renderSlot(config: SlotConfig, response: ServeResponse): void {
  if (!config.element.isConnected) return

  if (response.status === "empty" && response.price !== undefined) {
    config.serverPrice = response.price
  }

  const container = config.element
  container.innerHTML = ""

  if (response.status === "active") {
    renderActive(container, config, response)
  } else {
    renderPlaceholder(container, config)
  }
}

function renderActive(
  container: HTMLElement,
  config: SlotConfig,
  response: Extract<ServeResponse, { status: "active" }>
): void {
  const slot = document.createElement("div")
  slot.className = "adkit-slot adkit-slot--default-width"
  slot.dataset.adkitRatio = config.aspectRatio
  slot.dataset.adkitSize = config.size
  applyStyleVars(slot, config)

  const canvas = document.createElement("div")
  canvas.className = "adkit-canvas"

  const link = document.createElement("a")
  link.id = config.slot
  link.href = response.linkUrl
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.style.display = "block"
  link.style.width = "100%"
  link.style.height = "100%"

  link.addEventListener("click", () => {
    sendClickEvent(config, response)
  })

  const img = document.createElement("img")
  img.src = response.imageUrl
  img.alt = ""
  img.style.display = "block"
  img.style.width = "100%"
  img.style.height = "100%"
  img.style.objectFit = "contain"

  img.onerror = () => {
    logError("Ad image failed to load", {
      slotId: config.identity,
      siteId: config.siteId,
      slot: config.slot,
      imageUrl: response.imageUrl,
    })
    renderSlot(config, { status: "empty" })
  }

  link.appendChild(img)
  canvas.appendChild(link)
  slot.appendChild(canvas)
  container.appendChild(slot)

  if (config.theme === "auto") {
    setupThemeListener(slot, config)
  }
}

function renderPlaceholder(container: HTMLElement, config: SlotConfig): void {
  const displayPrice = config.serverPrice ?? config.price
  const hasPrice = displayPrice !== undefined
  const isBanner = config.aspectRatio === "banner"

  const slot = document.createElement("div")
  slot.className = "adkit-slot adkit-slot--default-width"
  slot.dataset.adkitRatio = config.aspectRatio
  slot.dataset.adkitSize = config.size
  applyStyleVars(slot, config)

  const canvas = document.createElement("div")
  canvas.className = "adkit-canvas"

  const box = document.createElement("div")
  box.id = `${config.slot}-placeholder`
  box.className = "adkit-box"
  box.setAttribute("role", "button")
  box.setAttribute("tabindex", "0")

  const content = document.createElement("div")
  content.className = "adkit-content"

  const label = document.createElement("div")
  label.className = "adkit-label"
  label.textContent = "Your ad here"
  content.appendChild(label)

  if (hasPrice) {
    const price = document.createElement("div")
    price.className = "adkit-price"
    price.textContent = `$${formatPrice(displayPrice)}/day`
    content.appendChild(price)
  }

  const cta = document.createElement("div")
  cta.className = "adkit-cta"
  cta.textContent = hasPrice ? (isBanner ? "Rent" : "Rent this spot") : "Learn more"

  const arrow = document.createElement("span")
  arrow.className = "adkit-arrow"
  arrow.textContent = "→"
  cta.appendChild(arrow)

  content.appendChild(cta)
  box.appendChild(content)
  canvas.appendChild(box)
  slot.appendChild(canvas)
  container.appendChild(slot)

  box.addEventListener("click", () => {
    openModal(config)
  })

  if (config.theme === "auto") {
    setupThemeListener(slot, config)
  }
}

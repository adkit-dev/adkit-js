/**
 * @fileoverview Type definitions for the Adkit JS SDK.
 *
 * This file contains all TypeScript types used throughout the SDK, including
 * configuration objects, API responses, and analytics event payloads.
 */

// ============================================================================
// SLOT CONFIGURATION TYPES
// ============================================================================

/**
 * Supported aspect ratios for ad slots.
 *
 * - "16:9"  - Widescreen, ideal for hero banners and video-style ads
 * - "4:3"   - Traditional, good for sidebars and content blocks
 * - "1:1"   - Square, social media style
 * - "9:16"  - Vertical/portrait, mobile and stories format
 * - "banner" - Leaderboard banner (728:90 ratio)
 */
export type AspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "banner"

/**
 * Text size presets for placeholder content.
 *
 * Controls the font sizes of the label, price, and CTA text within placeholders.
 * Larger slots should use "lg", smaller slots should use "sm" or "md".
 */
export type Size = "sm" | "md" | "lg"

/**
 * Color theme for the ad slot.
 *
 * - "light" - Dark text on light backgrounds
 * - "dark"  - Light text on dark backgrounds
 * - "auto"  - Automatically detect based on system preference (prefers-color-scheme)
 */
export type Theme = "light" | "dark" | "auto"

/**
 * Custom styling options for ad slots.
 *
 * Publishers can override default colors via data attributes to match their site's design.
 * All values should be valid CSS color strings (hex, rgb, rgba, hsl, etc.).
 */
export type SlotStyles = {
  /** Background color of the slot container */
  backgroundColor?: string
  /** Primary text color (used for price) */
  textColorPrimary?: string
  /** Secondary text color (used for label and CTA) */
  textColorSecondary?: string
  /** Border color (applied at 40%/60% opacity for normal/hover states) */
  borderColor?: string
}

/**
 * Complete configuration for an ad slot.
 *
 * This object is created by parsing data attributes from the DOM element
 * and is used throughout the SDK to render and track the slot.
 */
export type SlotConfig = {
  /** Reference to the DOM element containing the slot */
  element: HTMLElement
  /** Publisher's site ID from the Adkit dashboard */
  siteId: string
  /** Unique slot name within the site (e.g., "sidebar", "hero", "footer") */
  slot: string
  /** Aspect ratio for the slot container */
  aspectRatio: AspectRatio
  /**
   * Price hint from data attribute (in cents).
   * This is ONLY used during the loading state before the server responds.
   * The actual price displayed comes from the server response (serverPrice).
   */
  price?: number
  /**
   * Server-authoritative price (in cents).
   * Set after the serve API responds. This is the price displayed in the
   * placeholder and modal, and is the source of truth for billing.
   */
  serverPrice?: number
  /** Text size preset for placeholder content */
  size: Size
  /** Color theme for the slot */
  theme: Theme
  /** If true, disables all analytics event tracking for this slot */
  silent: boolean
  /** Unique identifier combining siteId and slot name (format: "siteId:slot") */
  identity: string
  /** Optional custom styling overrides */
  styles?: SlotStyles
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response from the /api/serve endpoint.
 *
 * The serve API is the single source of truth for slot data. It returns either
 * an active ad to display, or an empty status with server-authoritative pricing.
 *
 * @example Active ad response:
 * {
 *   status: "active",
 *   bookingId: "booking-123",
 *   imageUrl: "https://cdn.adkit.io/ads/image.jpg",
 *   linkUrl: "https://advertiser.com/landing",
 *   expiresAt: "2026-03-28T04:59:59.999Z"
 * }
 *
 * @example Empty slot response:
 * {
 *   status: "empty",
 *   price: 2500,
 *   aspectRatio: "4:3"
 * }
 */
export type ServeResponse =
  | {
      status: "active"
      /** Unique booking identifier for analytics */
      bookingId: string
      /** URL of the ad creative image */
      imageUrl: string
      /** Click-through URL for the ad */
      linkUrl: string
      /** ISO timestamp when the booking expires (optional) */
      expiresAt?: string
    }
  | {
      status: "empty"
      /** Server-authoritative price in cents (e.g., 2500 = $25.00/day) */
      price?: number
      /** Server-confirmed aspect ratio (may differ from data attribute) */
      aspectRatio?: string
    }

// ============================================================================
// ANALYTICS EVENT TYPES
// ============================================================================

/**
 * Event sent when a slot is first initialized on the page.
 *
 * This fires immediately after the slot is discovered, before the serve API
 * responds. The price field (if present) comes from the data attribute, not
 * the server, and is used by the backend for auto-slot-creation.
 */
export type SlotMountEvent = {
  type: "slot_mount"
  /** Publisher's site ID */
  siteId: string
  /** Slot name */
  slot: string
  /** Current page pathname */
  pathname: string
  /** Price from data attribute (optional, for auto-slot-creation) */
  price?: number
  /** Aspect ratio from data attribute */
  aspectRatio: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Event sent when 50% of the slot becomes visible in the viewport.
 *
 * This fires for both active ads AND placeholders, enabling fill rate
 * calculation. The bookingId is only present for active ads.
 */
export type SlotViewEvent = {
  type: "slot_view"
  /** Slot identity (format: "siteId:slot") */
  slotId: string
  /** Booking ID if an active ad is displayed (omitted for placeholders) */
  bookingId?: string
  /** Current page pathname */
  pathname: string
  /** Viewport dimensions as string (format: "1920x1080") */
  viewport: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Event sent when an active ad is clicked.
 *
 * This only fires for active ads, not placeholder clicks (which open the modal).
 */
export type SlotClickEvent = {
  type: "slot_click"
  /** Slot identity (format: "siteId:slot") */
  slotId: string
  /** Booking ID of the clicked ad */
  bookingId?: string
  /** Current page pathname */
  pathname: string
  /** Viewport dimensions as string (format: "1920x1080") */
  viewport: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Event sent when a duplicate slot identity is detected on the same page.
 *
 * Having two slots with the same siteId:slot identity is a configuration error.
 * Both slots will still render to avoid breaking the page, but this event
 * alerts the publisher to fix their implementation.
 */
export type SlotDuplicateEvent = {
  type: "slot_duplicate"
  /** Publisher's site ID */
  siteId: string
  /** Duplicate slot name */
  slot: string
  /** Current page pathname */
  pathname: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Union type of all possible analytics events.
 */
export type AdkitEvent = SlotMountEvent | SlotViewEvent | SlotClickEvent | SlotDuplicateEvent

// ============================================================================
// INTERNAL STATE TYPES
// ============================================================================

/**
 * Internal state tracking for a single slot.
 *
 * Used by the SDK to track initialization status and prevent duplicate
 * event firing.
 */
export type SlotState = {
  /** Slot configuration */
  config: SlotConfig
  /** Cached API response (null if not yet fetched) */
  response: ServeResponse | null
  /** Whether the mount event has been sent */
  mounted: boolean
  /** Whether the view event has been sent */
  viewed: boolean
}

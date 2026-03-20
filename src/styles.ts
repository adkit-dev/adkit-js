/**
 * @fileoverview CSS styles for ad slots and booking modal.
 *
 * This module contains all CSS used by the SDK, injected as a <style> tag
 * in the document head. The styles are designed to:
 *
 * - Be isolated (prefixed with .adkit-* to avoid conflicts)
 * - Be responsive (aspect ratio locked, width flexible)
 * - Support theming via CSS custom properties
 * - Work across all modern browsers
 *
 * ## CSS Custom Properties Used
 * These are set inline on each slot element by render.ts:
 *
 * - --adkit-aspect: Aspect ratio (e.g., "16 / 9")
 * - --adkit-bg: Background color
 * - --adkit-text: Secondary text color
 * - --adkit-text-muted: Muted text color (labels)
 * - --adkit-text-strong: Primary text color (price)
 * - --adkit-border: Border color (normal state)
 * - --adkit-border-hover: Border color (hover state)
 *
 * ## Size Presets
 * Controlled by data-adkit-size attribute:
 *
 * - sm: Compact text for small slots
 * - md: Medium text for standard slots
 * - lg: Large text for hero slots
 */

// ============================================================================
// CSS STYLES
// ============================================================================

/**
 * Complete CSS stylesheet for the Adkit SDK.
 *
 * Includes styles for:
 * - Slot container and canvas
 * - Placeholder box and content
 * - Size presets (sm, md, lg)
 * - Banner layout variant
 * - Booking modal and all its components
 * - Animations (fade-in, slide-up)
 */
const STYLES = `
/* ============================================================================
   SLOT CONTAINER
   ============================================================================ */

/*
 * Base slot container.
 * Uses inline-block to respect width constraints while allowing natural sizing.
 * No width set here so className (e.g., w-[320px]) can override without !important.
 */
.adkit-slot {
  position: relative;
  display: inline-block;
  max-width: 100%;
  flex: 0 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/*
 * Default width modifier.
 * Applied when no custom width class is provided.
 */
.adkit-slot--default-width {
  width: 100%;
}

/*
 * Height reset.
 * Ensures height is derived from width via aspect-ratio only.
 * Prevents external CSS from distorting the slot.
 */
.adkit-slot,
.adkit-slot *,
.adkit-canvas {
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
}

/* ============================================================================
   CANVAS (ASPECT RATIO CONTAINER)
   ============================================================================ */

/*
 * Canvas enforces the aspect ratio.
 * Uses CSS aspect-ratio property for reliable sizing.
 * The --adkit-aspect variable is set inline by render.ts.
 */
.adkit-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: var(--adkit-aspect) !important;
  overflow: hidden;
  background: var(--adkit-bg);
}

/*
 * Image sizing within canvas.
 * Uses object-fit: contain to preserve aspect ratio without cropping.
 */
.adkit-canvas img {
  width: auto !important;
  height: auto !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
}

/* ============================================================================
   PLACEHOLDER BOX
   ============================================================================ */

/*
 * Interactive placeholder box.
 * Fills the canvas with a dashed border and centered content.
 */
.adkit-box {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--adkit-border);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.adkit-box:hover {
  border-color: var(--adkit-border-hover);
}

/* ============================================================================
   PLACEHOLDER CONTENT
   ============================================================================ */

/*
 * Content container - centered layout (default).
 * Uses flexbox for vertical stacking of label, price, and CTA.
 */
.adkit-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--adkit-padding);
  gap: var(--adkit-gap);
}

/*
 * Banner layout variant.
 * Horizontal layout for wide, short banner slots.
 */
.adkit-slot[data-adkit-ratio="banner"] .adkit-content {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 12px;
}

.adkit-slot[data-adkit-ratio="banner"] .adkit-cta {
  margin-left: auto;
  margin-top: 0;
}

/*
 * Label text ("Your ad here" / "ad space").
 */
.adkit-label {
  font-size: var(--adkit-label-size);
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--adkit-text-muted);
}

/*
 * Price text ("$25/day").
 */
.adkit-price {
  font-size: var(--adkit-price-size);
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--adkit-text-strong);
}

/*
 * CTA button ("Rent this spot →").
 */
.adkit-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: var(--adkit-cta-mt);
  font-size: var(--adkit-cta-size);
  line-height: 1.25;
  font-weight: 500;
  color: var(--adkit-text);
  transition: color 0.15s ease;
}

.adkit-box:hover .adkit-cta {
  color: var(--adkit-text-strong);
}

/*
 * CTA arrow indicator.
 * Animates on hover for visual feedback.
 */
.adkit-arrow {
  opacity: 0.5;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.adkit-box:hover .adkit-arrow {
  transform: translateX(2px);
  opacity: 0.8;
}

/* ============================================================================
   SIZE PRESETS
   ============================================================================ */

/*
 * Small size - for compact slots (< 200px wide).
 */
.adkit-slot[data-adkit-size="sm"] {
  --adkit-label-size: 7px;
  --adkit-price-size: 10px;
  --adkit-cta-size: 6px;
  --adkit-gap: 2px;
  --adkit-cta-mt: 4px;
  --adkit-padding: 0 8px;
}

/*
 * Medium size - for standard slots (200-400px wide).
 */
.adkit-slot[data-adkit-size="md"] {
  --adkit-label-size: 9px;
  --adkit-price-size: 14px;
  --adkit-cta-size: 8px;
  --adkit-gap: 4px;
  --adkit-cta-mt: 8px;
  --adkit-padding: 0 12px;
}

/*
 * Large size - for hero slots (> 400px wide).
 */
.adkit-slot[data-adkit-size="lg"] {
  --adkit-label-size: 11px;
  --adkit-price-size: 18px;
  --adkit-cta-size: 10px;
  --adkit-gap: 4px;
  --adkit-cta-mt: 10px;
  --adkit-padding: 0 12px;
}

/* ============================================================================
   BOOKING MODAL
   ============================================================================ */

/*
 * Modal overlay (backdrop).
 * Covers entire viewport with semi-transparent background.
 */
.adkit-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  animation: adkit-fade-in 0.18s ease-out;
}

/*
 * Modal card (content container).
 * Centered white card with shadow and rounded corners.
 */
.adkit-modal-card {
  position: relative;
  width: 92%;
  max-width: 420px;
  padding: 32px 28px 24px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  color: #1a1a1a;
  animation: adkit-slide-up 0.22s ease-out;
}

/* ============================================================================
   MODAL ANIMATIONS
   ============================================================================ */

@keyframes adkit-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes adkit-slide-up {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ============================================================================
   MODAL CONTENT
   ============================================================================ */

/*
 * Modal headline.
 */
.adkit-modal-headline {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

/*
 * Modal subhead (description).
 */
.adkit-modal-subhead {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
}

/*
 * Feature bullet list.
 */
.adkit-modal-bullets {
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.adkit-modal-bullets li {
  margin-bottom: 4px;
  padding-left: 24px;
  position: relative;
}

.adkit-modal-bullets li::before {
  content: "✓";
  position: absolute;
  left: 0;
  font-weight: 700;
  color: #333;
}

/*
 * Price section.
 */
.adkit-modal-price-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 24px;
}

.adkit-modal-price {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111;
}

.adkit-modal-price-helper {
  font-size: 12px;
  color: #888;
}

/* ============================================================================
   MODAL ACTIONS
   ============================================================================ */

.adkit-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/*
 * Primary CTA button.
 */
.adkit-modal-cta {
  display: block;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #111;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease;
}

.adkit-modal-cta:hover {
  background: #333;
}

/*
 * Redirect hint text.
 */
.adkit-modal-redirect-hint {
  display: block;
  text-align: center;
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}

/*
 * Cancel button.
 */
.adkit-modal-cancel {
  display: block;
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #888;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: color 0.15s ease;
}

.adkit-modal-cancel:hover {
  color: #333;
}

/* ============================================================================
   MODAL FOOTER
   ============================================================================ */

.adkit-modal-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 11px;
  color: #bbb;
  letter-spacing: 0.02em;
}

.adkit-modal-footer a {
  color: inherit;
  text-decoration: none;
}

.adkit-modal-footer a:hover {
  text-decoration: underline;
}
`

// ============================================================================
// MODULE STATE
// ============================================================================

/**
 * Flag to track if styles have been injected.
 * Prevents duplicate style injection.
 */
let injected = false

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Inject CSS styles into the document head.
 *
 * Creates a <style> tag with id="adkit-styles" containing all SDK styles.
 * Safe to call multiple times - only injects once.
 *
 * Checks for existing #adkit-styles element to handle cases where the
 * script is loaded multiple times or styles are pre-loaded.
 */
export function injectStyles(): void {
  // Skip if already injected in this session
  if (injected) return

  // Check if styles already exist (e.g., from another script load)
  if (document.getElementById("adkit-styles")) {
    injected = true
    return
  }

  // Create and inject style element
  const style = document.createElement("style")
  style.id = "adkit-styles"
  style.textContent = STYLES
  document.head.appendChild(style)

  injected = true
}

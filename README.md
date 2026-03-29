# adkit-js

Vanilla JavaScript SDK for configuring and selling ad space directly on your website from within your codebase.

[![Bundle Size](https://img.shields.io/badge/minified-~18KB-blue)](https://cdn.adkit.dev/v1.js)
[![Gzipped](https://img.shields.io/badge/gzipped-~5.8KB-blue)](https://cdn.adkit.dev/v1.js)
[![Version](https://img.shields.io/badge/version-1.1.0-blue)](https://cdn.adkit.dev/v1.js)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Overview

The only requirements are our `<script>` tag and `<div>`. This SDK finds your slot `<div>`(s), fetches their status from the Adkit API, and renders one of two states:

- **Active ad** — the advertiser's creative, linked to their destination URL, with automatic impression and click tracking
- **Placeholder** — a "Rent this spot" card showing your daily rate, with a booking modal that sends visitors to Adkit to purchase
  
---

## Quick start

```html
<script src="https://cdn.adkit.dev/v1.js" defer></script>

<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="2500"
></div>
```

This slot would go live at $25/day. Visitors can book it directly by clicking on it while in placeholder state.

---

## Installation

### CDN (recommended)

```html
<script src="https://cdn.adkit.dev/v1.js" defer></script>
```

Place this tag in your `<head>` or before `</body>`. The `defer` attribute ensures the script doesn't block page rendering.

### Self-hosted

```html
<script src="/js/adkit-v1.js" defer></script>
```

Download `dist/v1.js` from this repository and serve it from your own infrastructure. Useful if you have strict CSP requirements or want full control over the asset.

---

## Configuration

### Required Attributes

Every slot element needs these four attributes. The SDK skips and logs an error for any slot missing one.

| Attribute | Description |
|---|---|
| `data-adkit-site` | Your Adkit site ID, found in the dashboard |
| `data-adkit-slot` | Unique name for this slot (letters, numbers, hyphens, underscores only) |
| `data-adkit-aspect-ratio` | The slot's shape — see [Aspect Ratios](#aspect-ratios) |
| `data-adkit-price` | Your daily asking price **in cents** (e.g. `2500` = $25/day) |

### Optional Attributes

| Attribute | Default | Description |
|---|---|---|
| `data-adkit-size` | `"lg"` | Placeholder text size — `"sm"`, `"md"`, or `"lg"` |
| `data-adkit-theme` | `"auto"` | Color theme — `"light"`, `"dark"`, or `"auto"` |
| `data-adkit-silent` | `"false"` | Set to `"true"` to disable all analytics tracking for this slot |

### Custom Styling Attributes

| Attribute | Description |
|---|---|
| `data-adkit-bg-color` | Background color of the slot (any CSS color value) |
| `data-adkit-text-color-primary` | Price text color |
| `data-adkit-text-color-secondary` | Label and CTA text color |
| `data-adkit-border-color` | Dashed border color (rendered at 40% opacity normally, 60% on hover) |

---

## Aspect Ratios

| Value | Ratio | Best for |
|---|---|---|
| `"16:9"` | 16:9 | Hero banners, video-style placements |
| `"4:3"` | 4:3 | Sidebars, content blocks |
| `"1:1"` | 1:1 | Square placements, social-style |
| `"9:16"` | 9:16 | Vertical/mobile, stories format |
| `"banner"` | 728:90 | Leaderboard banners |

The SDK enforces your chosen ratio via CSS `aspect-ratio`. Only the width of your container needs to be set — height is always derived automatically.

---

## Pricing

### Setting a Price

Set `data-adkit-price` to your daily rate in cents. The first time the SDK mounts the slot, it registers it at that price and the slot becomes immediately bookable.

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="2500"
></div>
```

### Changing a Price

Update the value in your HTML and redeploy. The SDK sends the new price to Adkit's server on the next `slot_mount` event.

- **Price increases** — applied immediately, no confirmation required
- **Price decreases** — you'll receive a confirmation via email or dashboard notification before the change takes effect. This prevents price from being lowered by devtools manipulation without your knowledge.

You can also change prices directly in the Adkit dashboard. Dashboard changes take effect immediately in either direction.

### How Pricing Works Under the Hood

The `data-adkit-price` attribute has two roles:

1. **During loading** — displayed immediately as a hint while the API fetch is in-flight, so the slot shows a price rather than a blank state
2. **After API response** — replaced by the server-authoritative price returned in the API response

The server price always wins once the fetch completes. Billing always uses the confirmed database price — the value in your HTML cannot be used to manipulate what an advertiser is charged.

---

## How It Works

### Initialization Flow

1. Script loads and waits for the DOM to be ready (`DOMContentLoaded` or `load`, depending on `document.readyState`)
2. After the `load` event, initialization is deferred one tick via `setTimeout(0)` to let frameworks like React and Vue finish hydrating
3. `window.__adkit` is registered (idempotent — calling `init()` twice has no effect)
4. CSS styles are injected as a single `<style id="adkit-styles">` tag in `<head>`
5. All `[data-adkit-slot]` elements are discovered and parsed in parallel
6. Each slot renders a loading state immediately, then fetches its status from `/api/serve`
7. On response, slots render either an active ad or a placeholder
8. A `MutationObserver` is set up to handle dynamically added slots

### Slot Lifecycle

For each slot:

```
Discovered → renderLoading() → sendMountEvent() → fetchAd()
                                                        ↓
                                          renderSlot() + observeSlot()
                                                        ↓
                                              Active ad  or  Placeholder
```

If the element is removed from the DOM during the fetch, the response is discarded silently.

### Loading State

The slot renders immediately in a "loading" state before the API responds. It shows the label "ad space" and your `data-adkit-price` value (if set) as a price hint. This prevents layout shift — the slot takes up its correct dimensions from the first render.

### Active Ad State

When a booking is active, the slot renders the advertiser's creative as a full-size image linked to their destination URL. Impressions are tracked at 50% viewport visibility. Clicks are tracked on the link click event. If the image fails to load, the slot falls back to the placeholder state automatically.

### Placeholder State

When no booking is active, the slot shows a dashed-border card with "Your ad here", your daily price (from the server), and a "Rent this spot" CTA. Clicking the placeholder opens a booking modal. Banner slots show a compact "Rent" label instead to fit the narrow format.

### Booking Modal

The modal provides advertisers with full context before redirecting to Adkit to complete the booking:

- Your site's hostname in the headline
- Fixed-price framing (no bidding, no auctions)
- Feature list (exclusive placement, review process, uptime guarantee, analytics)
- Server-authoritative daily price
- "Book this ad" CTA that redirects to `https://adkit.dev/book?siteId=...&slot=...&ref=...`

The price is **not** included in the booking URL. The Adkit booking page fetches it server-side to prevent URL manipulation.

The modal closes on Escape key, backdrop click, or the Cancel button. Body scroll is locked while the modal is open and restored on close.

---

## SPA Support

The SDK automatically detects dynamically added slots via `MutationObserver`. When new nodes are added to the DOM, the observer checks if they (or their descendants) are valid, uninitialized Adkit slots. If found, `initializeAllSlots()` is called after a 100ms debounce to batch rapid DOM changes.

For edge cases where auto-detection isn't sufficient (e.g. after a client-side route change that reuses DOM nodes), call refresh manually:

```js
await window.__adkit.refresh()
```

`refresh()` resets all tracking state, clears the slot cache, marks all elements as uninitialized, and re-runs the full discovery and initialization flow.

### SSR / Hydration Compatibility

The SDK is designed to coexist with server-rendered frameworks:

- Initialization is deferred until after the `load` event + one event loop tick, so React/Vue/etc. finish hydrating before the SDK touches the DOM
- Initialization state is tracked via an in-memory `WeakSet` — no DOM attributes are written for tracking purposes, avoiding hydration mismatches
- Style injection checks for an existing `#adkit-styles` element before inserting, so pre-rendered styles won't be duplicated

---

## Theming

### Built-in Themes

```html
<!-- Light (default for light backgrounds) -->
<div ... data-adkit-theme="light"></div>

<!-- Dark (for dark backgrounds) -->
<div ... data-adkit-theme="dark"></div>

<!-- Auto (follows system prefers-color-scheme) -->
<div ... data-adkit-theme="auto"></div>
```

`"auto"` is the default. It subscribes to `prefers-color-scheme` changes, so if the user switches their system between light and dark mode, all `auto` slots re-render automatically.

### Custom Colors

Override any part of the color scheme per-slot:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="branded"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="3000"
  data-adkit-bg-color="#fef3c7"
  data-adkit-text-color-primary="#92400e"
  data-adkit-text-color-secondary="#d97706"
  data-adkit-border-color="#f59e0b"
></div>
```

Border color is rendered using `color-mix()` at 40% opacity normally and 60% on hover. This requires Chrome 111+, Firefox 113+, or Safari 16.2+. On older browsers, a flat opacity fallback is used instead.

### Size Presets

The `data-adkit-size` attribute scales the label, price, and CTA text together:

| Value | Best for |
|---|---|
| `"sm"` | Compact slots under ~200px wide |
| `"md"` | Standard slots 200–400px wide |
| `"lg"` | Large/hero slots over 400px wide (default) |

---

## JavaScript API

The SDK exposes a minimal surface on `window.__adkit` after initialization:

```js
// SDK version
console.log(window.__adkit.version) // "1.1.0"

// Re-scan DOM and re-initialize all slots
await window.__adkit.refresh()
```

### `refresh()`

Performs a full reset and re-initialization:

1. Clears view/mount event tracking (so events fire again)
2. Clears duplicate detection state
3. Clears the internal slot state cache
4. Marks all slot elements as uninitialized
5. Runs `initializeAllSlots()` from scratch

Use this after SPA navigation or any time slots may have been added, removed, or had their attributes changed programmatically.

---

## Analytics Events

The SDK sends four event types to `https://adkit.dev/api/events`. All events are sent via `fetch` with `keepalive: true` and `credentials: "omit"`. Errors are silently swallowed — analytics never break the host page.

### `slot_mount`

Fires once per slot identity per page load, immediately on initialization (before the serve API responds).

```json
{
  "type": "slot_mount",
  "siteId": "your-site-id",
  "slot": "sidebar",
  "pathname": "/blog/my-post",
  "price": 2500,
  "aspectRatio": "4:3",
  "timestamp": 1743264000000
}
```

The `price` field is sent to the backend to set or update the slot's price. If `data-adkit-price` is not present on the element, `price` is omitted from the event.

### `slot_view`

Fires when 50% of the slot enters the viewport, via `IntersectionObserver`. Fires for both active ads **and** placeholders — this enables fill rate calculation (`active views / total views`). Fires at most once per slot per page load.

On browsers without `IntersectionObserver`, the event fires immediately on render as a fallback.

```json
{
  "type": "slot_view",
  "slotId": "your-site-id:sidebar",
  "bookingId": "booking-abc123",
  "pathname": "/blog/my-post",
  "viewport": "1440x900",
  "timestamp": 1743264000000
}
```

`bookingId` is only present when an active ad is displayed.

### `slot_click`

Fires when a visitor clicks an active ad. Does not fire for placeholder clicks (those open the booking modal).

```json
{
  "type": "slot_click",
  "slotId": "your-site-id:sidebar",
  "bookingId": "booking-abc123",
  "pathname": "/blog/my-post",
  "viewport": "1440x900",
  "timestamp": 1743264000000
}
```

### `slot_duplicate`

Fires when two or more slot elements share the same `siteId:slot` identity on the same page. Both slots still render, but the duplicate is flagged for the publisher to investigate.

```json
{
  "type": "slot_duplicate",
  "siteId": "your-site-id",
  "slot": "sidebar",
  "pathname": "/blog/my-post",
  "timestamp": 1743264000000
}
```

### Disabling Tracking

Add `data-adkit-silent="true"` to any slot to suppress all events for that slot:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="test-slot"
  data-adkit-aspect-ratio="1:1"
  data-adkit-price="1000"
  data-adkit-silent="true"
></div>
```

---

## Error Handling

The SDK is designed to never throw uncaught errors or break the host page. Every error path is caught and handled gracefully.

| Scenario | Behavior |
|---|---|
| Missing required attribute | Slot skipped, `console.error` logged with details |
| Invalid slot name | Slot skipped, `console.error` logged |
| Invalid optional attribute value | Default applied, `console.warn` logged |
| Aspect ratio CSS mismatch | `console.warn` logged, slot still renders |
| API fetch timeout (5s) | Slot falls back to placeholder |
| API non-200 response | Slot falls back to placeholder |
| API network failure | Slot falls back to placeholder |
| Element removed during fetch | Response discarded, nothing rendered |
| Ad image load failure | Automatic fallback to placeholder |
| Duplicate slot identity | Both render, `console.warn` + analytics event |

All console messages are prefixed with `[Adkit]` for easy filtering.

---

## Examples

### Sidebar (4:3)

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="2500"
  style="width: 300px;"
></div>
```

### Leaderboard Banner

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="header-banner"
  data-adkit-aspect-ratio="banner"
  data-adkit-price="10000"
  data-adkit-size="lg"
></div>
```

### Dark Theme Slot

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="dark-sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="2500"
  data-adkit-theme="dark"
></div>
```

### Custom Brand Colors

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="branded"
  data-adkit-aspect-ratio="1:1"
  data-adkit-price="3000"
  data-adkit-bg-color="#fef3c7"
  data-adkit-text-color-primary="#92400e"
  data-adkit-text-color-secondary="#d97706"
  data-adkit-border-color="#f59e0b"
></div>
```

### Multiple Slots on One Page

```html
<script src="https://cdn.adkit.dev/v1.js" defer></script>

<!-- Header leaderboard -->
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="header"
  data-adkit-aspect-ratio="banner"
  data-adkit-price="8000"
></div>

<!-- Sidebar -->
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="3500"
  style="width: 300px;"
></div>

<!-- In-content square -->
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="in-content"
  data-adkit-aspect-ratio="1:1"
  data-adkit-price="2000"
  style="width: 250px;"
></div>
```

All slots are fetched in parallel — multiple slots don't add sequential latency.

### SPA Usage (React/Vue/etc.)

The SDK handles most SPA cases automatically via `MutationObserver`. For manual control after route changes:

```js
// After navigating to a new route
router.afterEach(async () => {
  await window.__adkit?.refresh()
})
```

### Silent Test Slot

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="test"
  data-adkit-aspect-ratio="1:1"
  data-adkit-price="500"
  data-adkit-silent="true"
></div>
```

---

## Content Security Policy

If your site uses CSP headers, add the following directives:

```
script-src  https://cdn.adkit.dev;
connect-src https://adkit.dev;
img-src     https://ufs.sh;
```

`connect-src` covers both the serve API (`/api/serve`) and the analytics endpoint (`/api/events`). `img-src` covers ad creatives stored on UploadThing.

If you self-host the script, remove the `script-src` entry and serve from your own domain instead.

---

## Browser Support

| Browser | Minimum Version |
|---|---|
| Chrome | 88+ |
| Firefox | 89+ |
| Safari | 15+ |
| Edge | 88+ |

**Required browser APIs:** `IntersectionObserver`, `MutationObserver`, `fetch`, CSS `aspect-ratio`.

**`data-adkit-border-color`** requires `color-mix()` support: Chrome 111+, Firefox 113+, Safari 16.2+. On unsupported browsers, a flat opacity fallback is used — slots remain fully functional.

---

## Building from Source

```bash
npm install
npm run build
```

Output is written to `dist/v1.js` as a minified IIFE bundle targeting ES2020+.

```bash
npm run build:watch   # Rebuild on file changes
npm run typecheck     # Run TypeScript type checking without emitting
```

The bundle is built with esbuild. The entry point is `src/index.ts`. The output format is `iife` so it works as a plain `<script>` tag without a module bundler.

---

## License

MIT

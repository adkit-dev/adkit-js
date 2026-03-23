# adkit-js

Vanilla JavaScript SDK for selling ad space directly on your website.

![Bundle Size](https://img.shields.io/badge/minified-~23KB-blue)
![Gzipped](https://img.shields.io/badge/gzipped-~7KB-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## What This Does

Drop a script tag and a `<div>` on your page. The SDK renders ad slots that either display a paid ad or show a placeholder inviting visitors to book. Works on any website—no build step, no framework required.

## Quick Start

```html
<script src="https://cdn.adkit.dev/v1.js" defer></script>

<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="2500"
></div>
```

That's it. The SDK auto-discovers and renders the slot at $25/day.

## Installation

**CDN (recommended):**

```html
<script src="https://cdn.adkit.dev/v1.js" defer></script>
```

**Self-hosted:**

```html
<script src="/js/adkit-v1.js" defer></script>
```

Download `dist/v1.js` and serve it from your own infrastructure.

## Configuration

### Data Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-adkit-site` | Yes | — | Your Adkit site ID |
| `data-adkit-slot` | Yes | — | Unique slot name (alphanumeric, hyphens, underscores) |
| `data-adkit-aspect-ratio` | Yes | — | `"16:9"`, `"4:3"`, `"1:1"`, `"9:16"`, `"banner"` |
| `data-adkit-price` | Yes | — | Daily price in cents (e.g., 2500 = $25/day). Sets the slot price when first detected. Price increases apply immediately; decreases require confirmation. |
| `data-adkit-size` | No | `"lg"` | Text size: `"sm"`, `"md"`, `"lg"` |
| `data-adkit-theme` | No | `"auto"` | `"light"`, `"dark"`, `"auto"` |
| `data-adkit-silent` | No | `"false"` | Disable analytics tracking |

### Aspect Ratios

| Value | Ratio | Use Case |
|-------|-------|----------|
| `"16:9"` | 16:9 | Hero banners, video-style |
| `"4:3"` | 4:3 | Sidebar, content blocks |
| `"1:1"` | 1:1 | Square, social-style |
| `"9:16"` | 9:16 | Vertical/mobile, stories |
| `"banner"` | 728:90 | Leaderboard banner |

### Sizes

The `data-adkit-size` attribute controls placeholder text sizing. Values: `sm`, `md`, `lg`.

## How It Works

1. Script loads and discovers all `[data-adkit-slot]` elements
2. For each slot, fetches ad data from the Adkit API
3. If an active booking exists: renders the ad creative as a clickable image
4. If no booking exists: renders a placeholder showing the slot's price and a CTA to book
5. Clicking the placeholder opens a booking modal that redirects to Adkit's booking flow

All pricing displayed in the placeholder and modal comes from the server. The `data-adkit-price` attribute is only shown briefly during the initial fetch.

## Slot Behavior

### Placeholder Mode

When no active ad is booked, the slot displays a placeholder with a dashed border, the slot's price, and a "Rent this spot" CTA. Clicking opens a booking modal. The placeholder acts as a self-serve marketplace—site visitors can discover and book ad space directly.

### Active Ad Mode

When an advertiser has booked the slot, their creative image is rendered. Clicks redirect to the advertiser's destination URL. Impressions and clicks are tracked automatically.

### SPA Support

A MutationObserver automatically detects dynamically added slots. The observer is optimized to only trigger when new uninitialized slots are added—it ignores DOM changes from the SDK's own rendering. For edge cases where automatic detection doesn't work, call `window.__adkit.refresh()` to manually re-scan the DOM.

## Theming

Three modes: `light`, `dark`, `auto`.

`auto` follows the user's system preference via `prefers-color-scheme`.

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-theme="dark"
></div>
```

## Custom Styling

Override default colors with data attributes:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="custom-styled"
  data-adkit-aspect-ratio="4:3"
  data-adkit-bg-color="#f0f9ff"
  data-adkit-text-color-primary="#0369a1"
  data-adkit-text-color-secondary="#0284c7"
  data-adkit-border-color="#0ea5e9"
></div>
```

| Attribute | Description |
|-----------|-------------|
| `data-adkit-bg-color` | Background color (CSS color value) |
| `data-adkit-text-color-primary` | Price text color |
| `data-adkit-text-color-secondary` | Label and CTA text color |
| `data-adkit-border-color` | Dashed border color (applied at 40%/60% opacity) |

## JavaScript API

The SDK exposes a minimal API on `window.__adkit`:

- `window.__adkit.version` — SDK version string
- `window.__adkit.refresh()` — Re-scans DOM and re-fetches all slots

`refresh()` is useful for SPA route changes or after programmatically modifying slot attributes.

## Events

The SDK tracks `slot_mount`, `slot_view`, `slot_click`, and `slot_duplicate` events.

**slot_mount** — Fires when a slot is first initialized:

```json
{
  "type": "slot_mount",
  "siteId": "your-site-id",
  "slot": "sidebar",
  "pathname": "/page",
  "price": 2500,
  "aspectRatio": "4:3",
  "timestamp": 1234567890
}
```

**slot_view** — Fires at 50% visibility via IntersectionObserver:

```json
{
  "type": "slot_view",
  "slotId": "your-site-id:sidebar",
  "bookingId": "booking-123",
  "pathname": "/page",
  "viewport": "1920x1080",
  "timestamp": 1234567890
}
```

**slot_click** — Fires when an active ad is clicked:

```json
{
  "type": "slot_click",
  "slotId": "your-site-id:sidebar",
  "bookingId": "booking-123",
  "pathname": "/page",
  "viewport": "1920x1080",
  "timestamp": 1234567890
}
```

**slot_duplicate** — Fires when duplicate slot identity is detected:

```json
{
  "type": "slot_duplicate",
  "siteId": "your-site-id",
  "slot": "sidebar",
  "pathname": "/page",
  "timestamp": 1234567890
}
```

Notes:
- `slot_view` fires for both active ads and placeholders (for fill rate calculation)
- `bookingId` is only present on active ad events
- Events use `fetch` with `keepalive: true` and `credentials: "omit"`
- All event errors are silently swallowed
- Disable tracking per-slot with `data-adkit-silent="true"`

## Error Handling

- **Missing required attributes** — Slot is skipped, error logged
- **Invalid slot names** — Slot is skipped, error logged
- **Fetch failures** — 5s timeout, no retry, falls back to placeholder
- **Image load failures** — Automatic fallback to placeholder
- **Duplicate slots** — Warning logged, both still render

The SDK never throws errors or breaks the host page.

## Error Logging

The SDK sends error logs to `https://adkit.dev/api/sdk-logs` for monitoring. Each log includes:

- Error message and stack trace
- SDK version
- Page URL
- User agent
- Slot context (siteId, slot name)

Logged errors include:
- Missing/invalid configuration attributes
- API fetch failures and timeouts
- Image load failures
- Duplicate slot detection
- Initialization errors

Logs are sent via `fetch` with `keepalive: true` and never block rendering. Console errors/warnings are also shown locally for debugging.

## Examples

Premium banner with price:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="header-banner"
  data-adkit-aspect-ratio="banner"
  data-adkit-price="10000"
  data-adkit-size="lg"
></div>
```

Dark theme:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="dark-sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-theme="dark"
></div>
```

Custom branded:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="branded"
  data-adkit-aspect-ratio="1:1"
  data-adkit-bg-color="#fef3c7"
  data-adkit-text-color-primary="#92400e"
  data-adkit-text-color-secondary="#d97706"
  data-adkit-border-color="#f59e0b"
></div>
```

Silent mode (no tracking):

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="test-slot"
  data-adkit-aspect-ratio="1:1"
  data-adkit-silent="true"
></div>
```

## Content Security Policy

If your site uses CSP, allow:

```
script-src: cdn.adkit.dev
connect-src: adkit.dev (for API and logging)
img-src: ufs.sh (uploadthing)
```

## Browser Support

- Chrome 88+
- Firefox 89+
- Safari 15+
- Edge 88+

Required APIs: IntersectionObserver, MutationObserver, fetch, CSS `aspect-ratio`.

Custom border colors via `data-adkit-border-color` require `color-mix()` support (Chrome 111+, Firefox 113+, Safari 16.2+).

## Setting Prices in Code

Set your slot price directly in your HTML:

```html
<div
  data-adkit-site="your-site-id"
  data-adkit-slot="sidebar"
  data-adkit-aspect-ratio="4:3"
  data-adkit-price="2500"
></div>
```

The first time the SDK mounts, it registers this slot at $25/day. The slot is immediately bookable.

To change the price, update it in your code and redeploy:
- **Price increases** apply instantly on the next page load
- **Price decreases** require confirmation via email or dashboard notification (protects against devtools manipulation)

You can also change prices in the dashboard if you prefer.

## How Pricing Works

1. Set `data-adkit-price` in your code (required). The first mount registers the slot at that price.
2. To increase the price, change it in code and redeploy. Increases apply automatically.
3. To decrease the price, change it in code and redeploy. You'll receive an email/notification to confirm.
4. The booking page charges the database price, which syncs with your code-declared price.
5. Dashboard price changes take effect immediately regardless of direction.

## License

MIT

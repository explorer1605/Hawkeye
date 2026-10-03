# UI Context — Billet Vision

Visual and interaction source of truth for the Billet Vision dashboard. Derived from the reference screen, with deliberate corrections listed in section 15. Where this file and the reference image disagree, this file wins.

## 1. Design intent

- Users are plant operators, QC teams, and analysts. They glance at the screen from a distance, often for a second or two. Legibility and status clarity come before decoration.
- The screen is calm by default. Color is reserved for status and for the one interactive accent. When something is wrong, it is the only thing that is loud.
- The one memorable element is the Current Inspection verdict: the billet ID and the PASS / FAIL / REWORK / REVIEW result. Everything else stays quiet.
- Light content area under a dark navy header. The camera panel is dark because video reads better that way.

## 2. Layout

| Property | Value |
|---|---|
| Header height | 72px, fixed to top |
| Page padding (inline) | 32px at ≥1280, 24px at 768–1279, 16px below 768 |
| Max content width | 1760px, centered |
| Gap between cards | 24px |
| Card padding | 24px (20px below 768) |
| Top row | 12-column grid: Camera feed 7 cols, Current inspection 5 cols |
| Bottom row | Live alerts 6 cols, Inspection analytics 6 cols |
| Camera aspect ratio | 16:9, locked. The video is never cropped or stretched |

Inside Analytics, the Inspection trend and Defect distribution sit side by side at 7 / 5 of the card width, separated by a 24px gap. They are separated by space, not by nested bordered boxes.

## 3. Color

All values are tokens. Components never use raw hex.

```css
:root {
  /* Surfaces */
  --surface-page:        #F4F6F9;
  --surface-card:        #FFFFFF;
  --surface-sunken:      #EDF0F5;  /* table header, skeletons */
  --surface-header:      #0F1B2D;
  --surface-header-active: #1A2A44;
  --surface-video:       #0A101C;

  /* Text on light surfaces */
  --text-primary:        #14202F;
  --text-secondary:      #46566C;
  --text-muted:          #5F6F85;  /* timestamps, axis ticks, placeholders */

  /* Text on dark surfaces */
  --text-on-dark:        #F2F5FA;
  --text-on-dark-muted:  #A7B4C8;

  /* Lines */
  --border:              #E1E6EE;
  --border-strong:       #C9D1DD;
  --grid-line:           #E8ECF2;

  /* Interactive accent */
  --accent:              #2F6FED;
  --accent-hover:        #2559C4;
  --focus-ring:          #2F6FED;

  /* Status: solid (verdict block, chart lines, icons) */
  --status-pass:         #147A45;
  --status-fail:         #C4302B;
  --status-rework:       #F2A33A;   /* use --status-rework-on for text on it */
  --status-review:       #2F6FED;
  --status-rework-on:    #2B1A00;

  /* Status: tint (pills, alert icon circles) */
  --status-pass-bg:      #E4F4EB;  --status-pass-text:   #0E5C33;
  --status-fail-bg:      #FCEAE8;  --status-fail-text:   #9E211C;
  --status-rework-bg:    #FFF0D6;  --status-rework-text: #7A4A00;
  --status-review-bg:    #E6EFFD;  --status-review-text: #1B4DB0;

  /* Status on video (brighter so they hold up on footage) */
  --overlay-pass:        #3DDC84;
  --overlay-fail:        #FF6B63;
  --overlay-rework:      #FFB938;
  --overlay-review:      #6BB0FF;
  --overlay-ink:         #0A101C;  /* text on overlay chips */

  /* Categorical (Defect distribution only; never reused for status) */
  --cat-1: #3D4FA3;
  --cat-2: #2B8CA3;
  --cat-3: #8C5A9E;
  --cat-4: #B8863B;
}
```

Rules:

- Status meaning is fixed everywhere: **Pass = green, Fail = red, Rework = amber, Review = blue.**
- Status color is never the only signal. Always pair it with an icon and a text label.
- Defect categories use the categorical palette, not red/amber/green, so a "Crack" slice is not confused with a "Fail" status.
- Shadows are tinted navy (`rgba(15, 27, 45, …)`), never pure black.
- Light theme only for v1. Tokens are structured so a dark theme can be added later without touching components.

## 4. Typography

**Fonts**

- UI: **IBM Plex Sans** (400, 500, 600). Fallback `system-ui, "Segoe UI", sans-serif`.
- Identifiers: **IBM Plex Mono** (500), used only for billet IDs and OCR strings, where telling `0` from `O` matters. Same size as surrounding text, never smaller.
- Self-host both fonts (`@fontsource`). No CDN.
- Apply `font-variant-numeric: tabular-nums` to every number, time, and measurement so values do not jitter as data updates.

**Scale** (root 16px; sizes in rem)

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--text-hero` | 28 / 36 | 600 | Billet ID in Current Inspection |
| `--text-title` | 20 / 28 | 600 | Card titles |
| `--text-brand` | 22 / 28 | 600 | "Billet Vision" in header |
| `--text-body` | 16 / 24 | 400, 500 | Values, alert titles (600), table cells, nav, buttons |
| `--text-small` | 14 / 20 | 400, 500 | Field labels, alert details, header subtitle, legends, links |
| `--text-caption` | 13 / 18 | 400, 600 | Timestamps, chart ticks, pill text. **Floor: nothing is smaller than 13px** |

Rules:

- No text under 13px anywhere: chart axes, tooltips, overlay labels, table footers included.
- Sentence case for all labels, headings, table headers, and buttons. The only uppercase text is the status vocabulary inside pills and the verdict block (PASS, FAIL, REWORK, REVIEW), because operators read these as codes from a distance.
- Body line length stays under 80 characters.
- At ≥1920px viewport width (control-room displays) set root font size to 18px; everything scales with it.

## 5. Spacing and sizing

4px base grid.

| Token | px |
|---|---|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |
| `--space-12` | 48 |

Component sizes:

| Element | Size |
|---|---|
| Nav item | 44px tall |
| Button, input, select | 40px tall (44px on touch devices) |
| Status pill | 28px tall, 12px horizontal padding |
| Alert row | min 72px tall |
| Key-value row | 44px tall |
| Table row | 52px; header row 44px |
| Icon | 20px, stroke 1.75 |
| Alert icon circle | 36px |
| Minimum touch target | 44 × 44px |

## 6. Radius and elevation

Radius varies by element role. It is not one value for everything.

| Token | px | Use |
|---|---|---|
| `--radius-card` | 12 | Cards, video container |
| `--radius-control` | 8 | Buttons, inputs, selects, nav items, thumbnails |
| `--radius-chip` | 6 | Bounding-box label chips |
| `--radius-pill` | 999 | Status pills, LIVE chip |

Bounding-box rectangles themselves have **0 radius**. They mark a measured region.

Elevation has two levels only:

- `--shadow-card`: `0 1px 2px rgba(15, 27, 45, 0.05)`, paired with a 1px `--border`. Cards only.
- `--shadow-popover`: `0 8px 24px rgba(15, 27, 45, 0.14)`. Dropdowns, tooltips, dialogs.

Rows, pills, and buttons have no shadow.

## 7. Header and navigation

- Background `--surface-header`, 72px high, content aligned to the page padding.
- Left: logo mark (36px) and the "Billet Vision" name (`--text-brand`, `--text-on-dark`) with the subtitle "Automated inspection system" below it (`--text-small`, `--text-on-dark-muted`).
- Center-left: the three nav items **Live inspection**, **Analytics**, **Inspection log**.
- Right: connection indicator and current date/time.

**Nav items**

- These are route links, not an ARIA tablist. Use `<nav>` with `<a aria-current="page">`.
- Each is a 20px Lucide icon plus a `--text-body` 500 label, 44px tall, 16px horizontal padding, `--radius-control`.
- Inactive: `--text-on-dark-muted`. Hover: `rgba(255, 255, 255, 0.06)` background and `--text-on-dark` text.
- Active: `--surface-header-active` background, `--text-on-dark`, and a 2px underline in `#4C8DFF` along the bottom edge of the item.
- Focus: 2px `--focus-ring` outline with 2px offset.

**Connection indicator** (`--text-small`, 500)

| State | Dot | Text |
|---|---|---|
| Online | green | System online |
| Reconnecting | amber | Reconnecting… |
| Offline | red | Offline. Last data 10:41:57 |

**Date and time:** `03 Oct 2026, 10:42:18`. 24-hour clock, plant local time, tabular numerals, updates every second.

**Secondary tabs / filters** (e.g. analytics ranges) use a segmented control: 40px tall, `--radius-control`, 1px `--border-strong`, selected segment filled with `--accent` and white text.

## 8. Core components

### Card

White surface, 1px `--border`, `--shadow-card`, `--radius-card`, 24px padding. Header row: title (`--text-title`) with a 20px icon to its left, optional action on the right. Header-to-content gap 20px. Do not nest bordered boxes inside cards.

### Camera feed

- Video fills the card edge to edge, `--radius-card`, background `--surface-video`.
- Top bar overlays the video: 56px, solid `rgba(10, 16, 28, 0.72)`, no gradient. Title "Camera feed" (`--text-body` 600, white) at left. At right, the LIVE chip and FPS (`--text-small`, tabular).
- LIVE chip: 28px pill, dark translucent fill, green dot, "LIVE". The dot is solid while frames are arriving. If no frame arrives for 3 seconds the dot turns grey and the label becomes "No signal". The dot does not blink or pulse.
- **Current billet box:** 3px stroke in the status overlay color, 0 radius. A label chip sits on the top-left edge, outside the box: billet ID (mono) plus status, `--text-body` 600, `--overlay-ink` text on the overlay-color fill, `--radius-chip`, padding 4px 10px.
- **Other detected billets:** 1.5px stroke, 60% opacity, no label.
- Boxes are positioned from normalized (0–1) coordinates and follow the detection with no easing lag.
- The simulated feed shows a small "Simulated feed" tag at the bottom-left of the video (`--text-small`, white on the same dark fill as the top bar).

### Status pill

28px tall, `--radius-pill`, `--text-caption` 600, uppercase, 0.02em tracking. Tint background and tint text from the status tokens. Always includes the word. An icon is optional inside a pill and mandatory in alert rows.

### Current Inspection panel

1. Top row: "Current inspection" title on the left. Under it, the billet ID at `--text-hero` in mono.
2. Verdict block on the right of the top row: 48px tall, `--radius-control`, solid status color, 20px / 600 uppercase text (white on pass, fail, review; `--status-rework-on` on rework), with the status icon at left. This is the largest colored element on the screen.
3. Below: billet thumbnail (40% width, `--radius-control`, `object-fit: cover`) beside the key-value list.
4. Key-value list rows: label at left (`--text-small`, `--text-secondary`), value at right (`--text-body` 500, `--text-primary`, tabular, right-aligned). 1px `--border` between rows, none after the last.
5. A value outside tolerance (for example Width 154.2 mm) switches to `--status-fail-text` and shows a 16px alert icon before the value. Limits show on a second line in `--text-small`: "Limit 148 – 152 mm".
6. Fields and formats: Length `8120 mm`, Width `150.8 mm`, Height `151.2 mm`, Defect `None` or the defect name, Confidence `98%`.

### Live alerts list

- Rows sit directly in the card, separated by 1px `--border`. No inner bordered container.
- Row layout, left to right: 36px icon circle (status tint background, status text-color icon); text block; timestamp; status pill. 16px gaps.
- Text block: title (`--text-body` 600), then one detail line (`--text-small`, `--text-secondary`) made of labelled fields separated by 16px of space, not bullet characters. Example: `HT24053` (mono) and `Confidence 94%`.
- Timestamp: `--text-caption`, `--text-muted`, tabular, `HH:mm:ss`.
- Header link: "View all" with a Lucide `chevron-right` icon, `--text-small` 500, `--accent`.
- Shows the 5 most recent **non-pass** events. Passing billets are visible in Current Inspection and the Inspection Log.
- A new alert is inserted at the top with a 6-second `--status-*-bg` background that then fades out. Existing rows do not animate.

Status icons (Lucide): Pass `circle-check`, Fail `circle-x`, Rework `rotate-ccw`, Review `eye`.

### Inspection analytics

- Title "Inspection analytics" with the time-range select at right.
- Range select: 40px tall, `--text-body`, `--radius-control`, 1px `--border-strong`, chevron-down icon. Options: Last 15 minutes, Last hour, Last 8 hours, Last 24 hours, Last 7 days. Selection is stored in the URL.
- **Inspection trend** (see section 9) and **Defect distribution** sit side by side.
- Defect distribution: donut (ring thickness 28px) with the total fail count centered at `--text-hero` and "fails" beneath at `--text-small`. The legend lists name, count, and percentage per row at `--text-small`, with a 12px swatch. Slices are separated by a 2px `--surface-card` gap.

### Inspection Log

- Toolbar (56px): search input (320px, search icon, placeholder "Search billet ID"), Status filter, Defect filter, Date range, and **Export to Excel** (primary button with a Lucide `download` icon) at the far right.
- Table: sticky header on `--surface-sunken` (`--text-small` 600, sentence case, sortable columns show a chevron). Cells `--text-body`. Numeric columns right-aligned and tabular. Billet ID in mono. Status as a pill. Hover row `#F7F9FC`. No zebra striping.
- Columns: Time, Billet ID, Length, Width, Height, Defect, Confidence, Status.
- Pagination footer: rows-per-page select, "1–50 of 1,284", previous/next buttons (44px).
- Export respects the active filters and says so in its tooltip: "Exports the current filters".

### Buttons

| Variant | Style |
|---|---|
| Primary | `--accent` fill, white text, `--text-body` 500, 40px, `--radius-control`. Hover `--accent-hover` |
| Secondary | `--surface-card` fill, 1px `--border-strong`, `--text-primary` |
| Ghost | Transparent, `--text-secondary`; hover `--surface-sunken` |

One primary button per view region.

## 9. Charts

- Inspection trend is **two stacked panels sharing one time axis**: "Inspected" (green line, total billets per interval) on top at ~65% height, and "Fails" (red line or bars) below at ~35% height. This keeps the small fail count readable instead of flattened against a larger pass scale.
- Lines 2px, no area fill, no gradients. Points appear only on hover.
- Gridlines: horizontal only, 1px `--grid-line`. Y axes start at 0.
- Axis tick labels `--text-caption`, `--text-muted`. Show 4–6 ticks, never more.
- Tooltip: `--shadow-popover`, `--radius-control`, shows time plus each value with its label at `--text-small`.
- Direct-label series on the chart or in an inline legend at `--text-small`. Do not rely on color alone.
- Every chart has a visually hidden data table for screen readers.
- On first render animate over 300ms. Live updates append without re-animating the whole chart.

## 10. States

| State | Treatment |
|---|---|
| Loading | Static `--surface-sunken` skeleton blocks matching final layout. No shimmer |
| Empty | Icon, one-line explanation, and the next action. Example: "No inspections yet. The first billet will appear here when it passes the camera." |
| Error | What failed and what to do. Example: "Couldn't load the inspection log. Check the connection and try again." with a Retry button |
| Camera offline | Dark panel, `video-off` icon, "Camera feed unavailable", and a line pointing to the camera connection or the simulator |
| Disconnected | Persistent banner under the header in `--status-rework-bg`: "Connection lost. Showing data from 10:41:57. Reconnecting…" Panels dim to 70% opacity |
| Stale value | Timestamp beside the value turns `--status-rework-text` |

## 11. Motion

- Hover and focus: 150ms ease-out, color and background only.
- Dropdowns and popovers: 200ms opacity plus 4px translate.
- Bounding boxes: no transition.
- No page-load entrance animations. No staggered reveals. No hover lift on cards.
- The only unprompted attention motion is the 6-second highlight on a new non-pass alert.
- `prefers-reduced-motion: reduce` removes all transitions except opacity on popovers.

## 12. Accessibility

- Text contrast at least 4.5:1, UI components and boundaries at least 3:1.
- Every interactive element has a visible `:focus-visible` ring: 2px `--focus-ring`, 2px offset.
- Everything is keyboard operable. Tab order follows visual order. The select and filters use native or Radix-based accessible controls.
- New non-pass alerts are announced through an `aria-live` region: `assertive` for Fail, `polite` for Rework and Review.
- Touch targets are at least 44 × 44px.
- No sound by default. If audible alerts are added, they sit behind an explicit setting.

## 13. Content and copy

- Plain language, sentence case, active voice. Name things by what the operator sees, not how the system works.
- Fixed status vocabulary: Pass, Fail, Rework, Review. Do not use synonyms.
- Always show units: `150.8 mm`, `98%`.
- Alert titles name the problem: "Longitudinal crack detected", "Width out of tolerance", "OCR low confidence", "Billet passed inspection".
- Dimension alerts show the measured value and the allowed range: `Measured 154.2 mm. Limit 148 – 152 mm`.
- Times are 24-hour `HH:mm:ss`. Dates are `03 Oct 2026`.
- Button text states the outcome: "Export to Excel", "Retry". Not "Submit" or "Go".
- Errors say what happened and what to do. They do not apologize.

## 14. Responsive behavior

| Width | Behavior |
|---|---|
| ≥1280 | Layout as in section 2 |
| 768–1279 | Every row stacks to one column. Current Inspection keeps thumbnail and key-value list side by side. Analytics panels stack |
| <768 | Header shrinks to 56px: brand and connection dot only. Nav moves to a fixed bottom bar (64px, three items, icon above a 13px label). Single column. Log table scrolls horizontally with the Billet ID column sticky |
| ≥1920 | Root font size 18px. Content max-width stays 1760px |

## 15. Changes from the reference image

The reference is the layout and tone target. These are deliberate fixes:

1. **Text size.** The mock has 11–13px labels, ticks, and detail lines. Floor is now 13px, with detail lines at 14px.
2. **Status colors.** The mock shows Rework with a red icon and pink pill, and Fail with amber. Now Fail is red and Rework is amber everywhere.
3. **Alert list content.** The mock lists Pass events as alerts. Now only Fail, Rework, and Review appear.
4. **Detail strings.** The mock joins fields with bullet dots. Now separate labelled fields with spacing.
5. **Trend chart.** The mock has a flat fail line against a large pass scale and a tinted area fill. Now two stacked panels and no fill.
6. **Donut colors.** The mock reuses red, amber, and blue from the status set. Now a separate categorical palette.
7. **White text on solid green** was below 4.5:1. Now `#147A45` for solid pass, and dark ink on overlay chips.
8. **Copy.** "Succesfully" becomes "Billet passed inspection". Sentence case replaces title case for headings.
9. **Header time.** Mock shows 12-hour style `Oct 3, 2025`. Now `03 Oct 2026, 10:42:18`.
10. **Nested border** around the alert list is removed.

## 16. Do not

- No gradients, glows, glassmorphism, or blurred backdrops.
- No colored left-border accents on cards or rows.
- No emoji in the interface.
- No ALL-CAPS labels or eyebrow text above headings. Status codes are the only exception.
- No bullet-dot separated metadata strings.
- No arrows appended to button or link text. Use an icon component.
- No identical radius or shadow on every element.
- No pulsing, bouncing, or looping decorative animation.
- No pure black (`#000`) text or shadows.
- No numbering or step markers unless the content is a true sequence.
- No stock illustrations in empty states. Use a Lucide icon and one line of text.

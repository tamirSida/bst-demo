# Design system

Product-level design rules. **Nothing here is client-specific** — every colour,
the typeface and the logo are supplied by the active brand
(`lib/brand/config.ts`) and injected at runtime by `components/BrandStyle.tsx`.

## Changing the brand (the 60-second version)

1. Open `lib/brand/config.ts`, copy the `migdalor` preset, change the values,
   give it a new key.
2. If the company has a logo, drop a **single-colour SVG** at
   `public/brands/<key>.svg` and point `logo.src` at it. It is rendered as a
   mask filled with `currentColor`, so one file works on both the dark bars and
   the light surfaces. No logo? Leave it out — the name renders as a wordmark.
3. `NEXT_PUBLIC_BRAND=<key>` and restart.

Colours in the preset override the `@theme` defaults in `globals.css`. The
traffic-light ramps (`go` / `warn` / `stop`) are deliberately **not** brand
overridable: green-means-advance has to mean the same thing in every install.

## The feeling
Calm, editorial, architectural. RTL-first. Dark brand bar, light canvas,
hairlines rather than boxes, generous whitespace, and one accent at a time.
When in doubt, remove an accent.

## Typography
- **No bold, ever.** Weights stop at 500; `font-synthesis-weight: none` on
  `body` stops the browser faking one. Hierarchy comes from **size, colour and
  space**. `font-semibold`/`font-bold` are the single most reliable way to make
  this UI look generic.
- Page titles: `text-4xl sm:text-5xl font-light` with real air beneath
  (`PageHeader` / `PageHero` do this).
- Eyebrow labels: the `.t-eyebrow` utility (11px, 500, `0.14em` tracking).
- Numbers/dates: `.ltr-nums`. It is `display:inline-block` — never put it on a
  `<td>` (breaks table-cell layout); put it on a `<span>` inside the cell.
- Mixed Hebrew/Latin values that get truncated need `.bidi-isolate`.

## Components
- **Buttons** are full pills, 1px border on every variant (transparent where it
  shouldn't show, so all variants share one silhouette), `font-light`, 300ms.
- **No icon on card headings.** `CardHeader` has no icon slot on purpose — an
  icon beside every heading distinguishes nothing.
- **Imagery** is drawn, not photographed. The hero backdrop is a plot-and-massing
  motif built from hairlines. A brand may supply `heroImage` instead.

## Tables
Always `table-fixed` with an explicit `<colgroup>`. With auto layout the browser
sizes columns from content, so one long value widens a column and every sort or
filter visibly shifts the rest. Free-text cells `truncate` with the full value in
`title`. Ten columns do not fit a 1280–1440 laptop: mark the lowest-value ones
`optional` and drop them below the breakpoint rather than letting the table
overflow — in RTL the overflow clips the *last* columns and the row chevron.

## Layout gotchas that cost real bugs here
- Grid and flex children need `min-w-0`. The default `min-width: auto` means a
  child will not shrink below its content, so the widest child sets the track
  width and pushes everything else off the edge.
- `main` uses `overflow-x: clip`, which hides that class of bug rather than
  showing a scrollbar. Measure `main.scrollWidth - main.clientWidth`, not just
  `documentElement`.

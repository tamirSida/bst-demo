# BST Design Spec — app rebrand

Canonical reference for restyling the app to match **bst.co.il** exactly. Extracted
from the live site (computed styles + screenshots). Every agent must follow this;
do not invent colors, fonts, or radii not derived from here.

## The feeling
BST's identity is **calm, editorial, architectural**: a warm bone/cream page, dark
olive ink, thin airy headings, fully-rounded outlined pill buttons, generous
whitespace, and subtle geometric line-art. The OPPOSITE of the app's current bright
blue. Muted and sophisticated, never loud. When in doubt, remove an accent.

## Color tokens (already wired in `app/globals.css` @theme — use the token names)

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#E5E5D6` | page background (warm bone) |
| `surface` | `#FFFFFF` | cards, panels |
| `surface-muted` | `#EDECE3` | muted fills, table headers, chips |
| `ink-900` | `#454A3F` | primary text, headings (dark olive) |
| `ink-700` | `#5C6353` | body text |
| `ink-500` | `#7C8273` | secondary / labels (olive-gray) |
| `ink-400` | `#9CA093` | muted / captions |
| `line` | `#D4D3CB` | hairlines, borders (warm taupe) |
| `brand-600` | `#454A3F` | primary action (solid olive) |
| `brand-700/800` | `#3A3E33` / `#2E322A` | hover/active |
| `brand-50/100` | `#EDEDE4` / `#DADACB` | tint backgrounds, active nav |
| `accent-500` | `#4A5464` | links, informational highlight (muted slate) |
| `logo-cream` | `#ECEBE1` | the cream logo color on dark surfaces |

Traffic-light (triage semantics) — kept functional but **muted/earthy** to fit BST:
- `go` sage green `#5E7350` (50 `#EAEEE3`, 700 `#3E4E35`) — advance / positive
- `warn` ochre `#B8823A` (50 `#F6EEDF`, 700 `#7E5722`) — review / caution
- `stop` brick `#A24B3C` (50 `#F4E4E0`, 700 `#6F3126`) — reject / critical

## Typography
- Site font is **`fbparking`** — BST's own brand face. It is now **self-hosted**
  from the same `.woff2` files bst.co.il serves (`public/fonts/FbParking*.woff2`),
  declared as `@font-face` in `app/globals.css` and set as `--font-sans`.
  Hebrew and Latin are separate cuts split by `unicode-range`, matching the real
  site. Heebo remains wired in `app/layout.tsx` only as the swap-in fallback.
  - **Licensing:** FbParking is a commercial foundry font. It is used here on
    BST's own product; confirm BST's licence covers self-hosting in this app.
    To revert, delete the `@font-face` blocks and drop `"FbParking"` from
    `--font-sans` — Heebo takes over with no other change.
- **The brand has NO bold.** The foundry ships 300 / 400 / 500 only. Never use
  `font-semibold` or `font-bold`; `font-synthesis-weight: none` on `body` stops
  the browser faking one. Hierarchy comes from **size, colour and space**.
- **Headings are LIGHT and large.** Page titles `text-4xl sm:text-5xl font-light`
  with generous space beneath (`PageHeader` does this).
- Body: 400. Eyebrow labels: use the `.t-eyebrow` utility (11px, 500, `0.14em`
  tracking, `ink-500`) — the counterweight that lets light headings stay light.
- Numbers/dates stay LTR via the existing `.ltr-nums` class. Note `.ltr-nums` is
  `display:inline-block` — never put it on a `<td>`, it breaks table-cell layout.
  Put it on a `<span>` inside the cell.

## Photography
BST's identity is photography-led. Real project images live in `public/img/`
(pulled from bst.co.il). Use them full-bleed with a **gradient** scrim
(`from-brand-800/85 via-brand-800/25 to-transparent`), never a flat veil — the
photograph should stay vivid where nothing sits on top of it.

## Tables
Always `table-fixed` with an explicit `<colgroup>`. With auto layout the browser
sizes columns from their content, so one paragraph-length value widens a column
and every sort or filter visibly shifts the rest. Free-text cells `truncate` and
carry the full value in `title`.

## Signature elements (replicate these — they make it read as BST)
1. **Pill buttons.** Fully rounded (`rounded-full`). Primary = solid `brand-600`
   olive with cream/white text. Secondary/default = **outlined**: 1px `ink-900`
   border, transparent bg, `ink-900` text; hover fills faint. Use `radius-pill`.
2. **Thin large headings**, right-aligned (RTL), lots of space above/below.
3. **Dark-olive bars carry the cream logo.** The sidebar/top strip should be dark
   olive `#454A3F` (`brand-600`) with the **cream** logo and muted-cream nav text —
   this is BST's signature dark-bar treatment and uses the real logo asset.
4. **Geometric line-art motifs** — thin 1px `line`-colored quarter-circles / rounded
   squares as subtle margin/empty-state decoration. Tasteful and sparse.
5. White cards on cream canvas, `line` hairlines, soft shadow (subtle, low).

## Logo
- Asset: `public/logo.svg` (BST wordmark + "מעל 50 שנות נדל״ן" tagline), single-color.
- Use the **`<Logo>` component** (`components/Logo.tsx`) — it inlines the SVG with
  `fill="currentColor"`, so it takes the text color: **cream** (`text-[#ECEBE1]`) on
  dark olive bars, **olive** (`text-ink-900`) on light. Size via width/height on the
  wrapper. Do NOT edit `components/Logo.tsx` (foundation-owned).
- Logo placement (all "מגדלור" text is removed): dashboard sidebar header, mobile
  nav, login screen, public-form header, and browser tab (favicon/title already set).

## What "done" looks like (DoD)
Full app — every screen — reads like bst.co.il: cream + olive palette, Heebo light
headings, pill buttons, the cream logo on dark bars, no bright blue anywhere, no
"מגדלור" text. Login and the public form included. RTL preserved, responsive, a11y
focus intact.

## Guardrails
- Only use tokens above. No raw blues/hexes from the old theme.
- Keep all copy, flows, and component APIs working — this is visual only.
- Do NOT edit: `app/globals.css`, `app/layout.tsx`, `components/Logo.tsx`,
  `package.json` (foundation-owned). Do NOT run `npm run dev`/`build` (central).

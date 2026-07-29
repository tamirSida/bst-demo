/**
 * White-label brand configuration.
 *
 * Everything company-specific in the product — name, logo, palette, typeface,
 * the prefix stamped on lead thread markers — lives here and nowhere else. To
 * present the app to a different company you edit or add ONE preset and set
 * NEXT_PUBLIC_BRAND; no component, stylesheet or copy string needs touching.
 *
 * Colours are emitted as CSS custom properties at runtime (see BrandStyle),
 * overriding the defaults declared in globals.css `@theme`. That means a brand
 * swap is a re-render, not a rebuild of the Tailwind token layer.
 *
 * Adding a brand:
 *   1. Copy a preset below, change the values, give it a new key.
 *   2. Drop a logo at `public/brands/<key>.svg` (single-colour: it is rendered
 *      as a mask filled with currentColor, so it inherits light/dark context).
 *   3. Set NEXT_PUBLIC_BRAND=<key> and restart.
 */

export interface BrandPalette {
  /** Primary/action ramp. 600 is the solid action colour. */
  brand50: string;
  brand100: string;
  brand300: string;
  brand400: string;
  brand500: string;
  brand600: string;
  brand700: string;
  brand800: string;
  brand900: string;
  /** Page background, panel background, muted fill. */
  canvas: string;
  surface: string;
  surfaceMuted: string;
  /** Text ramp, darkest first. */
  ink900: string;
  ink700: string;
  ink500: string;
  ink400: string;
  /** Hairline/border. */
  line: string;
  /** Logo colour when it sits on a dark bar. */
  logoContrast: string;
}

export interface Brand {
  key: string;
  /** Short name shown in the UI and in email sign-offs. */
  name: string;
  /** Browser title / metadata. */
  productTitle: string;
  productDescription: string;
  /** One-line descriptor under the logo on the sign-in screen. */
  tagline: string;
  /**
   * Logo mask. Omit to render the name as a wordmark instead — which is what
   * an unbranded install should do rather than showing someone else's mark.
   */
  logo?: { src: string; aspectRatio: string };
  /**
   * Stamped into outbound mail so replies thread back to the right lead
   * (e.g. "LD" → [LD-L-0042]). Keep it short, uppercase and stable: changing
   * it means older threads no longer match.
   */
  leadMarkerPrefix: string;
  /** Optional hero image (public path). Omit for the non-photographic hero. */
  heroImage?: string;
  palette: BrandPalette;
  /** CSS font stack. The default ships with the app; a brand may override it. */
  fontFamily: string;
}

/**
 * Default, unbranded identity. Deliberately not any client's colours: a cool
 * slate ink over warm paper, with a single restrained accent. Neutral enough
 * to demo to anyone, specific enough not to look like a starter template.
 */
const migdalor: Brand = {
  key: "migdalor",
  name: "מגדלור",
  productTitle: "מגדלור — ניהול וסינון לידים",
  productDescription: "מערכת סינון וניתוח לידים להתחדשות עירונית",
  tagline: "סינון לידים · פיתוח עסקי",
  leadMarkerPrefix: "LD",
  fontFamily: '"Heebo", "Assistant", system-ui, sans-serif',
  palette: {
    brand50: "#eef1f5",
    brand100: "#dbe1ea",
    brand300: "#9aa8bd",
    brand400: "#75859e",
    brand500: "#566880",
    brand600: "#3d4c62",
    brand700: "#313d4f",
    brand800: "#26303e",
    brand900: "#1b222c",
    canvas: "#f0eee9",
    surface: "#ffffff",
    surfaceMuted: "#e9e6e0",
    ink900: "#22282f",
    ink700: "#3f4854",
    ink500: "#6b7481",
    ink400: "#949ca7",
    line: "#d8d4cc",
    logoContrast: "#f3f1ec",
  },
};

/** Registry. Add a preset here to make it selectable via NEXT_PUBLIC_BRAND. */
export const BRANDS: Record<string, Brand> = {
  [migdalor.key]: migdalor,
};

export const DEFAULT_BRAND_KEY = migdalor.key;

/**
 * The active brand. Read from NEXT_PUBLIC_BRAND so the same value is available
 * on the server and in the browser without a round trip; falls back to the
 * default when unset or unknown rather than failing to render.
 */
export function activeBrand(): Brand {
  const key = process.env.NEXT_PUBLIC_BRAND?.trim();
  return (key && BRANDS[key]) || BRANDS[DEFAULT_BRAND_KEY];
}

/** Palette → the CSS custom properties globals.css declares in `@theme`. */
export function brandCssVars(brand: Brand): Record<string, string> {
  const p = brand.palette;
  return {
    "--color-brand-50": p.brand50,
    "--color-brand-100": p.brand100,
    "--color-brand-300": p.brand300,
    "--color-brand-400": p.brand400,
    "--color-brand-500": p.brand500,
    "--color-brand-600": p.brand600,
    "--color-brand-700": p.brand700,
    "--color-brand-800": p.brand800,
    "--color-brand-900": p.brand900,
    "--color-canvas": p.canvas,
    "--color-surface": p.surface,
    "--color-surface-muted": p.surfaceMuted,
    "--color-ink-900": p.ink900,
    "--color-ink-700": p.ink700,
    "--color-ink-500": p.ink500,
    "--color-ink-400": p.ink400,
    "--color-line": p.line,
    "--color-logo-cream": p.logoContrast,
    "--font-sans": brand.fontFamily,
  };
}

import { activeBrand, brandCssVars } from "@/lib/brand/config";

/**
 * Emits the active brand's palette as `:root` custom properties, overriding the
 * defaults declared in globals.css `@theme`.
 *
 * Rendered in the root layout before anything paints, so there is no flash of
 * the default palette. Server-rendered from the same config the server reads,
 * so the markup is identical on both sides and nothing has to hydrate.
 */
export function BrandStyle() {
  const vars = brandCssVars(activeBrand());
  const css = `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

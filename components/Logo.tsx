import { activeBrand } from "@/lib/brand/config";
import { cn } from "@/lib/cn";

/**
 * The active brand's mark.
 *
 * A brand-supplied logo is drawn as a CSS mask filled with `currentColor`, so
 * one asset works on light and dark alike — set the colour with a text class
 * and the height with `className`; the width follows the aspect ratio.
 *
 * With no logo and no name, this renders NOTHING. A placeholder glyph is a
 * shape that means nothing to anyone; an unbranded install is better with an
 * empty slot than with invented decoration.
 */
export function Logo({ className }: { className?: string }) {
  const brand = activeBrand();

  if (!brand.logo && !brand.name) return null;

  if (!brand.logo) {
    return (
      <span
        role="img"
        aria-label={brand.name}
        className={cn(
          "inline-flex items-center whitespace-nowrap font-semibold leading-none",
          className,
        )}
      >
        {brand.name}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={brand.name}
      className={cn("inline-block bg-current", className)}
      style={{
        aspectRatio: brand.logo.aspectRatio,
        WebkitMaskImage: `url(${brand.logo.src})`,
        maskImage: `url(${brand.logo.src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

import { activeBrand } from "@/lib/brand/config";
import { cn } from "@/lib/cn";

/**
 * The active brand's mark.
 *
 * When the brand supplies a logo file it is drawn as a CSS mask filled with
 * `currentColor`, so one asset works on both the dark bars and the light
 * surfaces — set the colour with a text class and the height with `className`
 * (e.g. `h-9 text-logo-cream`); the width follows the aspect ratio.
 *
 * When it doesn't, we set the brand name as a wordmark rather than shipping a
 * placeholder graphic. An unbranded install should look deliberately unbranded,
 * not like it is still wearing somebody else's logo.
 */
export function Logo({ className }: { className?: string }) {
  const brand = activeBrand();

  if (!brand.logo) {
    return (
      <span
        role="img"
        aria-label={brand.name}
        className={cn(
          "inline-flex items-center whitespace-nowrap font-light leading-none tracking-[0.18em]",
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

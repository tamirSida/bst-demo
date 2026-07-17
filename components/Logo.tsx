import { cn } from "@/lib/cn";

/**
 * BST logo (from public/logo.svg — wordmark + "מעל 50 שנות נדל״ן" tagline).
 * Rendered as a CSS mask filled with `currentColor`, so it inherits the text
 * color: cream (`text-logo-cream`) on the dark-olive bars, olive (`text-ink-900`)
 * on light surfaces. Size it by setting a height in `className` (e.g. `h-9`);
 * width follows the logo's aspect ratio automatically.
 */
export function Logo({
  className,
  label = "BST",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block bg-current", className)}
      style={{
        aspectRatio: "1667 / 834",
        WebkitMaskImage: "url(/logo.svg)",
        maskImage: "url(/logo.svg)",
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

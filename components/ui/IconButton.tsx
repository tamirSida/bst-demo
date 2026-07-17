import type { ButtonHTMLAttributes } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

/** A square, icon-only button (edit pencils, close buttons). */
export function IconButton({
  icon,
  label,
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconDefinition;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-ink-500",
        "hover:bg-surface-muted hover:text-ink-900 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10",
        className,
      )}
      {...rest}
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "go";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-card",
  secondary:
    "bg-surface text-ink-900 border border-line hover:bg-surface-muted active:bg-surface-muted",
  ghost: "bg-transparent text-ink-700 hover:bg-surface-muted",
  danger: "bg-surface text-stop-700 border border-stop-100 hover:bg-stop-50",
  go: "bg-go-600 text-white hover:bg-go-700 active:bg-go-700 shadow-card",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-sm",
  md: "h-11 px-4 text-[0.95rem] gap-2 rounded",
  lg: "h-14 px-6 text-base gap-2.5 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconDefinition;
  iconEnd?: IconDefinition;
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
}

/** The single button primitive. Large tap targets, one clear primary per screen. */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconEnd,
  loading = false,
  block = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none select-none",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <FontAwesomeIcon icon={spinnerIcon} spin className="text-current" />
      ) : (
        icon && <FontAwesomeIcon icon={icon} className="text-current" />
      )}
      {children}
      {!loading && iconEnd && <FontAwesomeIcon icon={iconEnd} className="text-current" />}
    </button>
  );
}

// Imported lazily-ish to keep this file self-contained.
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
const spinnerIcon = faCircleNotch;

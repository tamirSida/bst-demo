import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "go";
type Size = "sm" | "md" | "lg";

// BST: fully-rounded pills. Primary = solid olive; secondary = outlined olive;
// ghost = text only; danger = outlined brick; go = solid sage.
/*
 * Measured off bst.co.il's own `.c-button`: fully-rounded pill, 1px border on
 * every variant (transparent where it shouldn't show, so all variants share one
 * silhouette), light weight, and a 300ms transition rather than Tailwind's 150.
 */
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-600 text-white border-transparent hover:bg-brand-500 active:bg-brand-700",
  secondary:
    "bg-transparent text-ink-900 border-ink-900 hover:bg-brand-50 active:bg-brand-100",
  ghost: "bg-transparent text-ink-700 border-transparent hover:bg-surface-muted hover:text-ink-900",
  danger: "bg-transparent text-stop-700 border-stop-500 hover:bg-stop-50 active:bg-stop-100",
  go: "bg-go-600 text-white border-transparent hover:bg-go-700 active:bg-go-700",
};

/* Generous horizontal padding is part of the look — the real buttons are far
   wider than their text. Vertical padding is asymmetric (more above than below)
   because Hebrew sits high in the em box. */
const SIZE: Record<Size, string> = {
  sm: "h-9 px-5 text-sm gap-1.5 rounded-full",
  md: "h-11 px-8 text-[0.95rem] gap-2 rounded-full",
  lg: "h-14 px-10 text-base gap-2.5 rounded-full",
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
        "inline-flex items-center justify-center border font-light transition-all duration-300",
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

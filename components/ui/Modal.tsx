"use client";

import { useEffect, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

/**
 * A centered modal dialog. Closes on backdrop click and Escape. Kept dependency
 * free (no portal lib) — renders under a fixed full-screen overlay.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative w-full bg-surface rounded-xl shadow-pop border border-line",
          "max-h-[90vh] flex flex-col animate-[fadeIn_0.12s_ease-out]",
          width,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 border-b border-line">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="w-9 h-9 inline-flex items-center justify-center rounded text-ink-400 hover:bg-surface-muted hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-line bg-surface-muted/40 rounded-b-xl flex items-center justify-start gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

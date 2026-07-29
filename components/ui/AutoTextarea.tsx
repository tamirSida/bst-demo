"use client";

import { useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * A textarea that grows to fit its content.
 *
 * A fixed `rows` count silently clips answers that run longer than the box —
 * the text is still there and still saved, but the person reviewing it can't
 * see it, which is the worst failure mode for a form whose whole job is
 * reviewing answers. Growing to content also removes the need for the native
 * resize grabber, which sits on the wrong side under RTL and never matches the
 * rest of the controls.
 */
export function AutoTextarea({
  value,
  minRows = 2,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    // Collapse first, otherwise scrollHeight only ever ratchets upward.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Layout effect so the first paint is already the right height (no jump).
  useLayoutEffect(resize, [value]);

  // Re-fit when the column width changes and the text reflows.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onInput={resize}
      // Enforced here rather than left to each caller: the box already grows to
      // fit, so the native grabber does nothing except render — on the wrong
      // side under RTL, in a style nothing else in the app shares.
      className={cn("resize-none overflow-hidden", className)}
      {...rest}
    />
  );
}

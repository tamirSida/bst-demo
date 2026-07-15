import { cn } from "@/lib/cn";

/** Round initials avatar for contacts (deterministic tint by name). */
export function Avatar({ name, className }: { name: string | null; className?: string }) {
  const initials = (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-sm font-bold shrink-0",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

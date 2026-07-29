import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Full-bleed page hero — a BST project photograph under an olive scrim, the
 * page title set large and light on top, and a row of live figures along the
 * bottom edge.
 *
 * This exists because the app was all white panels on cream: correct colours,
 * no presence. BST's own site opens every page on a building, and the numbers
 * this tool exists to produce (how many leads are waiting, how many deadlines
 * are close) are worth stating at that scale rather than burying in a card.
 *
 * It breaks out of `main`'s padding with negative margins so the image reaches
 * the viewport edges, then re-applies the padding to its own content.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  image = "/img/project-halechi.jpg",
  stats,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image?: string;
  /** Small figures along the bottom edge — the page's live state. */
  stats?: { label: string; value: ReactNode }[];
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative -mx-4 -mt-6 mb-8 overflow-hidden sm:-mx-6 lg:-mx-10 lg:-mt-10",
        className,
      )}
    >
      <Image
        src={image}
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Two layers: a flat olive wash for brand + contrast, then a stronger
          gradient from the bottom so the figures stay readable over any crop. */}
      <div className="absolute inset-0 bg-brand-800/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-brand-900/10 to-transparent" />

      <div className="rise relative px-4 pt-10 pb-6 sm:px-6 lg:px-10 lg:pt-14 lg:pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && <p className="t-eyebrow !text-logo-cream/60">{eyebrow}</p>}
            <h1 className="mt-2 text-4xl font-light leading-none tracking-tight text-logo-cream sm:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-[0.9375rem] text-logo-cream/70">{subtitle}</p>
            )}
          </div>
          {/* No shrink-0. On a phone the toolbar is wider than the column, and
              refusing to shrink pushed it clean off the inline-start edge —
              where an ancestor's overflow-x:clip meant it could not even be
              scrolled back into view. Let it wrap instead. */}
          {action && <div className="w-full sm:w-auto">{action}</div>}
        </div>

        {stats && stats.length > 0 && (
          <dl className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-logo-cream/15 pt-5">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="text-3xl font-light leading-none text-logo-cream">
                  {s.value}
                </dd>
                <dt className="t-eyebrow mt-2 !text-logo-cream/55">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

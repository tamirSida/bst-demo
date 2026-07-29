import Image from "next/image";
import type { ReactNode } from "react";
import { activeBrand } from "@/lib/brand/config";
import { cn } from "@/lib/cn";

/**
 * Full-bleed page hero: the page title set large and light over a dark brand
 * band, with the figures this page exists to produce along the bottom edge.
 *
 * The backdrop is drawn, not photographed. A stock building photo is exactly
 * the kind of borrowed atmosphere that makes a product look generic, and it
 * can't be white-labelled — so the default is a plot-and-massing motif built
 * from hairlines: the plan view this product is actually about. A brand that
 * has its own imagery can still supply `heroImage`.
 *
 * Breaks out of `main`'s padding with negative margins, then re-applies it to
 * its own content.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  stats,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Small figures along the bottom edge — the page's live state. */
  stats?: { label: string; value: ReactNode }[];
  action?: ReactNode;
  className?: string;
}) {
  const heroImage = activeBrand().heroImage;

  return (
    <section
      className={cn(
        "relative -mx-4 -mt-6 mb-8 overflow-hidden bg-brand-800 sm:-mx-6 lg:-mx-10 lg:-mt-10",
        className,
      )}
    >
      {heroImage ? (
        <>
          <Image
            src={heroImage}
            alt=""
            aria-hidden
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/40 to-brand-900/20" />
        </>
      ) : (
        <PlotMotif />
      )}

      <div className="rise relative px-4 pt-10 pb-6 sm:px-6 lg:px-10 lg:pt-14 lg:pb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && <p className="t-eyebrow !text-logo-cream/55">{eyebrow}</p>}
            <h1 className="mt-2 text-4xl font-light leading-none tracking-tight text-logo-cream sm:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-[0.9375rem] text-logo-cream/65">{subtitle}</p>
            )}
          </div>
          {/* No shrink-0: on a phone the toolbar is wider than the column, and
              refusing to shrink pushes it off the inline-start edge. */}
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

/**
 * Plot-and-massing motif — a cadastral plan fading into the band.
 *
 * Hairline plot boundaries with a few blocks massed on top, at the scale a
 * planner reads. Deliberately faint and asymmetric: it should register as
 * texture, not as a chart competing with the numbers in front of it.
 */
function PlotMotif() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-0 h-full w-full text-logo-cream"
        viewBox="0 0 1200 320"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Plot boundaries */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.14">
          <path d="M0 232 H1200" />
          <path d="M0 172 H1200" />
          <path d="M150 320 V172" />
          <path d="M330 320 V172" />
          <path d="M470 320 V232" />
          <path d="M660 320 V172" />
          <path d="M845 320 V232" />
          <path d="M1010 320 V172" />
        </g>
        {/* Massing — building footprints extruded above the plot line */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.2">
          <rect x="182" y="96" width="118" height="136" />
          <rect x="206" y="60" width="70" height="36" />
          <rect x="500" y="126" width="130" height="106" />
          <rect x="524" y="88" width="82" height="38" />
          <rect x="878" y="110" width="102" height="122" />
          <rect x="898" y="72" width="62" height="38" />
        </g>
        {/* Dimension ticks along the plot line */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.28">
          <path d="M182 240 V224 M300 240 V224 M182 232 H300" />
          <path d="M500 240 V224 M630 240 V224 M500 232 H630" />
        </g>
        {/* A couple of surveyed points */}
        <g fill="currentColor" opacity="0.3">
          <circle cx="182" cy="232" r="2.5" />
          <circle cx="300" cy="232" r="2.5" />
          <circle cx="630" cy="232" r="2.5" />
          <circle cx="980" cy="232" r="2.5" />
        </g>
      </svg>
      {/* Sink the motif toward the bottom so the title sits on clean colour. */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-800 via-brand-800/70 to-transparent" />
    </div>
  );
}

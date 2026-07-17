import type { Contact } from "@/lib/domain/types";

/**
 * Contact display: the person, the developer company, and the referring firm,
 * with the email rendered as a `mailto:` link (the must-have field for reaching
 * the lead) and an optional `tel:` link. Renders an em-dash when nothing usable
 * is present. Guards the links so a blank value never produces `mailto:`/`tel:`
 * with no address.
 */
export function ContactCard({ contact }: { contact: Contact | null }) {
  const name = contact?.name?.trim();
  const company = contact?.company?.trim();
  const firm = contact?.firm?.trim();
  const email = contact?.email?.trim();
  const phone = contact?.phone?.trim();

  if (!name && !company && !firm && !email && !phone) {
    return <span className="text-ink-400">—</span>;
  }

  const org = [company, firm].filter(Boolean).join(" · ");

  return (
    // whitespace-normal overrides the fact-row value wrapper's truncate/nowrap so
    // a long email wraps (break-all) instead of widening the panel.
    <div className="flex flex-col gap-0.5 text-start whitespace-normal">
      {name && <span className="font-medium text-ink-900">{name}</span>}
      {org && <span className="text-xs text-ink-500">{org}</span>}
      {email && (
        <a
          href={`mailto:${email}`}
          dir="ltr"
          className="text-xs text-accent-600 hover:underline break-all"
        >
          {email}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} dir="ltr" className="text-xs text-ink-500 hover:underline ltr-nums">
          {phone}
        </a>
      )}
    </div>
  );
}

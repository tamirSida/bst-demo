"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleNotch } from "@fortawesome/free-solid-svg-icons";

interface Processing {
  id: string;
  subject: string;
  from: string | null;
  at: string;
}

const POLL_MS = 2500;
const FLASH_MS = 5000;

/** Human line describing which email is being processed. */
function describe(p: Processing): string {
  const subject = p.subject?.trim();
  const from = p.from?.trim();
  if (subject) return `«${subject}»`;
  if (from) return `מאת ${from}`;
  return "פנייה חדשה";
}

/**
 * Live inbound indicator. Polls the poller's in-flight markers a few times a
 * second and shows a banner the instant an email starts being ingested — then
 * pulls the finished lead into the list the moment processing completes. Gives
 * the non-technical user immediate proof the email hook fired, instead of a
 * silent wait.
 */
export function InboundStatus() {
  const router = useRouter();
  const [processing, setProcessing] = useState<Processing[]>([]);
  const [justFinished, setJustFinished] = useState(false);
  const prevIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    let timer: number;

    const poll = async () => {
      try {
        const res = await fetch("/api/inbound/processing", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { processing: Processing[] };
        if (!alive) return;

        const nextIds = new Set(data.processing.map((p) => p.id));
        // Any id that was in-flight and is now gone = ingestion finished.
        let finished = false;
        prevIds.current.forEach((id) => {
          if (!nextIds.has(id)) finished = true;
        });
        prevIds.current = nextIds;
        setProcessing(data.processing);

        if (finished) {
          router.refresh(); // pull the new lead into the server-rendered list
          setJustFinished(true);
          window.setTimeout(() => {
            if (alive) setJustFinished(false);
          }, FLASH_MS);
        }
      } catch {
        /* transient — try again next tick */
      }
    };

    const loop = () => {
      if (document.visibilityState === "visible") void poll();
      timer = window.setTimeout(loop, POLL_MS);
    };
    loop();

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [router]);

  if (processing.length > 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/70 px-4 py-3">
        <FontAwesomeIcon icon={faCircleNotch} spin className="text-brand-600 text-lg" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-brand-800">
            {processing.length === 1
              ? "מתקבל ליד חדש — המערכת מנתחת את הפנייה…"
              : `מתקבלים ${processing.length} לידים — המערכת מנתחת…`}
          </p>
          <p className="text-xs text-brand-700/80 truncate">
            {describe(processing[0])} · קריאת המייל והנספחים והרצת סינון (כ-30 שניות)
          </p>
        </div>
      </div>
    );
  }

  if (justFinished) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-go-100 bg-go-50/70 px-4 py-3">
        <FontAwesomeIcon icon={faCircleCheck} className="text-go-600 text-lg" />
        <p className="text-sm font-bold text-go-800">ליד חדש התקבל ונותח — נוסף לרשימה למטה</p>
      </div>
    );
  }

  return null;
}

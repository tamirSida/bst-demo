"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleNotch,
  faEnvelopeOpenText,
  faPlus,
  faTriangleExclamation,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

type Phase = "idle" | "uploading" | "error";

/**
 * The primary "＋ ליד חדש" action. Opens a modal to upload an .eml, POSTs it to
 * /api/ingest (~30s AI pipeline), then navigates to the new lead. The long
 * loading state is explicit so the PM knows the machine is working.
 */
export function NewLeadButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase("idle");
    setError(null);
    setFileName(null);
  };

  const upload = async (file: File) => {
    setFileName(file.name);
    setPhase("uploading");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body });
      const data = (await res.json()) as { leadId?: string; error?: string };
      if (!res.ok || !data.leadId) throw new Error(data.error ?? "הניתוח נכשל");
      setOpen(false);
      router.push(`/leads/${data.leadId}`);
    } catch (err) {
      setPhase("error");
      setError((err as Error).message);
    }
  };

  const uploading = phase === "uploading";

  return (
    <>
      <Button variant="primary" size="lg" icon={faPlus} onClick={() => setOpen(true)}>
        ליד חדש
      </Button>

      <Modal
        open={open}
        onClose={() => {
          if (!uploading) {
            setOpen(false);
            reset();
          }
        }}
        title="ליד חדש ממייל"
        size="md"
      >
        {uploading ? (
          <div className="flex flex-col items-center text-center py-8">
            <FontAwesomeIcon icon={faCircleNotch} spin className="text-4xl text-brand-600 mb-4" />
            <p className="font-bold text-ink-900 text-lg">מנתח את הליד…</p>
            <p className="text-ink-500 text-sm mt-1">
              קורא את המייל, מחלץ נתונים ומריץ סינון. זה עשוי לקחת כחצי דקה.
            </p>
            {fileName && (
              <p className="text-ink-400 text-xs mt-2 ltr-nums" dir="ltr">
                {fileName}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-ink-500 text-sm mb-2">
              בחרו קובץ מייל בפורמט <span className="ltr-nums">.eml</span>. המערכת תחלץ את הנתונים
              ותפיק סינון אוטומטי.
            </p>
            <p className="text-ink-400 text-xs mb-4 leading-relaxed">
              איך משיגים קובץ כזה? ב-Outlook: גוררים את המייל מהרשימה אל שולחן העבודה.
              ב-Gmail: פותחים את המייל ← שלוש נקודות ← «הורדת ההודעה».
              והכי פשוט — אפשר גם להעביר את המייל ישירות לכתובת המערכת.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "w-full rounded-lg border-2 border-dashed border-line hover:border-brand-400 hover:bg-brand-50/40",
                "flex flex-col items-center justify-center gap-2 py-10 transition-colors cursor-pointer",
              )}
            >
              <FontAwesomeIcon icon={faEnvelopeOpenText} className="text-3xl text-ink-400" />
              <span className="text-ink-700 font-semibold">בחירת קובץ .eml</span>
              <span className="text-ink-400 text-xs">מייל שהתקבל מעו״ד / מארגן</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".eml,message/rfc822"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-stop-50 border border-stop-100 p-3 text-sm text-stop-700">
                <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div className="mt-4 flex justify-start">
              <Button
                variant="secondary"
                icon={faUpload}
                onClick={() => inputRef.current?.click()}
              >
                העלאת קובץ
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

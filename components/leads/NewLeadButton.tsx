"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCircleCheck,
  faCircleNotch,
  faFileLines,
  faKeyboard,
  faPlus,
  faTriangleExclamation,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

type Tab = "text" | "file";
type Phase = "idle" | "uploading" | "queued" | "error";

/**
 * The primary "＋ ליד חדש" action. Two input points, one pipeline:
 *  - paste free text (a message / deal details), or
 *  - upload a file (.eml → parsed as email; PDF/doc → read as a document).
 * POSTs to /api/ingest, which hands the ~30s AI pipeline to a background job;
 * the new lead appears in the list shortly after (auto-refresh).
 */
export function NewLeadButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = phase === "uploading";

  const reset = () => {
    setPhase("idle");
    setError(null);
    setFileName(null);
    setText("");
    setTab("text");
  };

  const submit = async (body: FormData, label: string | null) => {
    setFileName(label);
    setPhase("uploading");
    setError(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST", body });
      const data = (await res.json()) as { queued?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "הניתוח נכשל");
      // The lead is being processed in the background; it will land in the list.
      setPhase("queued");
      router.refresh();
    } catch (err) {
      setPhase("error");
      setError((err as Error).message);
    }
  };

  const submitText = () => {
    if (!text.trim()) {
      setError("יש להזין טקסט.");
      setPhase("error");
      return;
    }
    const body = new FormData();
    body.append("text", text);
    void submit(body, null);
  };

  const submitFile = (file: File) => {
    const body = new FormData();
    // .eml is parsed as an email; everything else runs the manual document path.
    if (/\.eml$/i.test(file.name)) body.append("file", file);
    else body.append("files", file);
    void submit(body, file.name);
  };

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
        title="ליד חדש"
        size="md"
      >
        {uploading ? (
          <div className="flex flex-col items-center text-center py-8">
            <FontAwesomeIcon icon={faCircleNotch} spin className="text-4xl text-brand-600 mb-4" />
            <p className="font-semibold text-ink-900 text-lg">מנתח את הליד…</p>
            <p className="text-ink-500 text-sm mt-1">
              קורא את הפנייה, מחלץ נתונים ומריץ סינון. זה עשוי לקחת כחצי דקה.
            </p>
            {fileName && (
              <p className="text-ink-400 text-xs mt-2 ltr-nums" dir="ltr">
                {fileName}
              </p>
            )}
          </div>
        ) : phase === "queued" ? (
          <div className="flex flex-col items-center text-center py-8">
            <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-go-600 mb-4" />
            <p className="font-semibold text-ink-900 text-lg">הליד התקבל</p>
            <p className="text-ink-500 text-sm mt-1">
              הפנייה מעובדת ברקע — מחלצת נתונים ומריצה סינון. הליד יופיע ברשימה בעוד רגע.
            </p>
            <div className="mt-5">
              <Button
                variant="primary"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                סגירה
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Segmented tabs: paste text / upload file */}
            <div role="tablist" aria-label="אופן יצירת הליד" className="flex gap-1 mb-4 p-1 rounded-full bg-surface-muted">
              <TabButton active={tab === "text"} icon={faKeyboard} onClick={() => { setTab("text"); setError(null); }}>
                הדבקת טקסט
              </TabButton>
              <TabButton active={tab === "file"} icon={faFileLines} onClick={() => { setTab("file"); setError(null); }}>
                העלאת קובץ
              </TabButton>
            </div>

            {tab === "text" ? (
              <>
                <p className="text-ink-500 text-sm mb-3">
                  הדביקו את תוכן הפנייה — גוף מייל, הודעה או פרטי המתחם. המערכת תחלץ את הנתונים ותפיק
                  סינון אוטומטי.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  dir="rtl"
                  placeholder={'לדוגמה: פרויקט פינוי בינוי ברחוב ... , 40 יח"ד קיימות, 5 דונם, עו"ד ...'}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <div className="mt-4 flex justify-start">
                  <Button variant="primary" icon={faPlus} onClick={submitText} disabled={!text.trim()}>
                    צור ליד
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-ink-500 text-sm mb-1.5">
                  העלו קובץ מייל בפורמט <span className="ltr-nums">.eml</span> או מסמך{" "}
                  <span className="ltr-nums">PDF</span>. המערכת תקרא את התוכן ותפיק סינון.
                </p>
                <p className="text-ink-400 text-xs mb-4 leading-relaxed">
                  PDF וטקסט נקראים ומנותחים; קבצים אחרים נשמרים לצפייה בלבד.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "w-full rounded-lg border-2 border-dashed border-line hover:border-brand-400 hover:bg-brand-50/40",
                    "flex flex-col items-center justify-center gap-2 py-10 transition-colors cursor-pointer",
                  )}
                >
                  <FontAwesomeIcon icon={faUpload} className="text-3xl text-ink-400" />
                  <span className="text-ink-700 font-semibold">בחירת קובץ</span>
                  <span className="text-ink-400 text-xs ltr-nums">PDF · .eml · עד 15MB</span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".eml,message/rfc822,application/pdf,.pdf,.doc,.docx,.rtf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) submitFile(file);
                    e.target.value = "";
                  }}
                />
              </>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-stop-50 border border-stop-100 p-3 text-sm text-stop-700">
                <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}

function TabButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: IconDefinition;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-2 rounded-full h-9 text-sm font-medium transition-colors",
        active ? "bg-surface text-ink-900 shadow-card" : "text-ink-500 hover:text-ink-700",
      )}
    >
      <FontAwesomeIcon icon={icon} className="text-sm" />
      {children}
    </button>
  );
}

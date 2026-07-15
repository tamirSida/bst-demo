"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCloudArrowUp,
  faPaperPlane,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import type { FormQuestion, LeadForm } from "@/lib/domain/types";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";

type Value = string | number | boolean | null;

/** Seed a question's starting value from its prefill. */
function initialValue(q: FormQuestion): Value {
  if (q.prefill != null) return q.prefill;
  if (q.kind === "boolean") return false;
  return "";
}

/**
 * The interactive part of the public form. Renders each FormQuestion by kind,
 * validates required fields, and POSTs to /api/forms/[token]. Mobile-first and
 * dependency-light — this is what a lawyer fills on their phone.
 */
export function PublicForm({ form, token }: { form: LeadForm; token: string }) {
  const [values, setValues] = useState<Record<string, Value>>(() =>
    Object.fromEntries(form.questions.map((q) => [q.key, initialValue(q)])),
  );
  const [files, setFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(form.status === "submitted");
  const [error, setError] = useState<string | null>(null);

  // Mark the form as opened on first load.
  useEffect(() => {
    void fetch(`/api/forms/${token}`).catch(() => {});
  }, [token]);

  const setValue = (key: string, v: Value) => setValues((s) => ({ ...s, [key]: v }));

  const missingRequired = form.questions.filter((q) => {
    if (!q.required) return false;
    if (q.kind === "file") return !files[q.key];
    const v = values[q.key];
    return v == null || v === "";
  });

  const submit = async () => {
    if (missingRequired.length) {
      setError("יש למלא את כל השדות המסומנים בכוכבית.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const answers: LeadForm["answers"] = {};
      for (const q of form.questions) {
        if (q.kind === "file") {
          const f = files[q.key];
          if (f) answers[q.key] = { value: f.name };
        } else {
          answers[q.key] = { value: values[q.key] };
        }
      }
      // Multipart: answers as JSON + each real file keyed by its question.
      const fd = new FormData();
      fd.append("answers", JSON.stringify(answers));
      for (const [key, f] of Object.entries(files)) fd.append(`file:${key}`, f, f.name);
      const res = await fetch(`/api/forms/${token}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("השליחה נכשלה, נסו שוב.");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-go-50 text-go-600 mb-4">
          <FontAwesomeIcon icon={faCircleCheck} className="text-3xl" />
        </span>
        <h2 className="text-xl font-bold text-ink-900">תודה! הפרטים התקבלו</h2>
        <p className="text-ink-500 mt-1">נחזור אליכם בהקדם. אפשר לסגור את החלון.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {form.questions.map((q) => (
        <QuestionField
          key={q.key}
          q={q}
          value={values[q.key]}
          fileName={files[q.key]?.name}
          onValue={(v) => setValue(q.key, v)}
          onFile={(file) => setFiles((s) => ({ ...s, [q.key]: file }))}
        />
      ))}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-stop-50 border border-stop-100 p-3 text-sm text-stop-700">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        block
        icon={faPaperPlane}
        loading={submitting}
        onClick={submit}
      >
        שליחת הפרטים
      </Button>
      <p className="text-center text-xs text-ink-400">
        השדות המסומנים ב-<span className="text-stop-600">*</span> הם חובה.
      </p>
    </div>
  );
}

/* --------------------------- single question ----------------------------- */

function QuestionField({
  q,
  value,
  fileName,
  onValue,
  onFile,
}: {
  q: FormQuestion;
  value: Value;
  fileName?: string;
  onValue: (v: Value) => void;
  onFile: (file: File) => void;
}) {
  const suffix = q.unit ? `${q.label} (${q.unit})` : q.label;

  if (q.kind === "boolean") {
    return (
      <Field label={suffix} help={q.help} required={q.required}>
        <Toggle checked={Boolean(value)} onChange={onValue} />
      </Field>
    );
  }

  if (q.kind === "longtext") {
    return (
      <Field label={suffix} help={q.help} required={q.required}>
        <Textarea
          value={String(value ?? "")}
          onChange={(e) => onValue(e.target.value)}
        />
      </Field>
    );
  }

  if (q.kind === "select") {
    return (
      <Field label={suffix} help={q.help} required={q.required}>
        <Select value={String(value ?? "")} onChange={(e) => onValue(e.target.value)}>
          <option value="">בחירה…</option>
          {q.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (q.kind === "file") {
    return (
      <Field label={suffix} help={q.help} required={q.required}>
        <label
          className={cn(
            "flex items-center gap-3 rounded-lg border-2 border-dashed border-line px-4 py-3.5 cursor-pointer",
            "hover:border-brand-400 hover:bg-brand-50/40 transition-colors",
            fileName && "border-go-100 bg-go-50/50",
          )}
        >
          <FontAwesomeIcon
            icon={fileName ? faCircleCheck : faCloudArrowUp}
            className={fileName ? "text-go-600 text-lg" : "text-ink-400 text-lg"}
          />
          <span className={cn("text-sm truncate", fileName ? "text-go-700" : "text-ink-500")}>
            {fileName ?? "העלאת קובץ"}
          </span>
          {!fileName && (
            <span className="ms-auto text-xs text-ink-400 whitespace-nowrap">PDF · עד 15MB</span>
          )}
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      </Field>
    );
  }

  // number / percent / currency / date / text
  const inputType =
    q.kind === "number" || q.kind === "percent" || q.kind === "currency"
      ? "number"
      : q.kind === "date"
        ? "date"
        : "text";

  return (
    <Field label={suffix} help={q.help} required={q.required}>
      {/* dir=ltr on the wrapper so the suffix's end-3 lands opposite the digits */}
      <div
        className="relative"
        dir={inputType === "number" || inputType === "date" ? "ltr" : "rtl"}
      >
        <Input
          type={inputType}
          value={String(value ?? "")}
          onChange={(e) => onValue(e.target.value)}
          className={cn(
            (q.kind === "percent" || q.kind === "currency") && "pe-9",
            inputType === "number" && "ltr-nums text-start",
          )}
          dir={inputType === "number" || inputType === "date" ? "ltr" : "rtl"}
        />
        {q.kind === "percent" && (
          <span className="absolute top-1/2 -translate-y-1/2 end-3 text-ink-400 text-sm">%</span>
        )}
        {q.kind === "currency" && (
          <span className="absolute top-1/2 -translate-y-1/2 end-3 text-ink-400 text-sm">₪</span>
        )}
      </div>
    </Field>
  );
}

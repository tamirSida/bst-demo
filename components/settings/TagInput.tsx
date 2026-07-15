"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

/** Editable list of string tags (city lists). Add on Enter, remove with the X. */
export function TagInput({
  values,
  onChange,
  placeholder = "הוספת עיר…",
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-2.5 flex flex-wrap gap-2">
      {values.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 text-brand-700 px-3 h-8 text-sm font-semibold"
        >
          {tag}
          <button
            type="button"
            aria-label={`הסרת ${tag}`}
            onClick={() => onChange(values.filter((v) => v !== tag))}
            className="text-brand-400 hover:text-stop-600"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </span>
      ))}
      <div className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "h-8 min-w-32 px-2 text-sm bg-transparent text-ink-900 placeholder:text-ink-400",
            "focus:outline-none",
          )}
        />
        {draft.trim() && (
          <button
            type="button"
            onClick={add}
            aria-label="הוספה"
            className="w-8 h-8 inline-flex items-center justify-center rounded text-brand-600 hover:bg-brand-50"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        )}
      </div>
    </div>
  );
}

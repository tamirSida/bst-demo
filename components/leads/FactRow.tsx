"use client";

import { useState, useTransition, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faFileLines,
  faPen,
  faRobot,
  faXmark,
  faKeyboard,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { LeadFactKey, Provenance } from "@/lib/domain/types";
import { updateFact } from "@/app/actions";
import { Tooltip } from "@/components/ui/Tooltip";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

/** Icon by provenance origin — how we know this value. */
function originIcon(prov?: Provenance): IconDefinition | null {
  if (!prov) return null;
  if (prov.origin === "manual") return faKeyboard;
  if (prov.origin === "ai") return faRobot;
  return faFileLines;
}

export interface EditConfig {
  /** Raw value to seed the input. */
  raw: string;
  /** Input type. `select` uses options. */
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  /**
   * How to coerce the input string into the stored value. Declarative (not a
   * function) so a server component can pass this across the boundary.
   *   string  → trimmed string or null
   *   number  → Number or null
   *   percent → Number/100 (user types "60" → 0.6) or null
   *   boolean → "true"/"false"
   */
  coerce: "string" | "number" | "percent" | "boolean";
}

function coerceValue(kind: EditConfig["coerce"], input: string): string | number | boolean | null {
  const trimmed = input.trim();
  if (kind === "boolean") return trimmed === "true";
  if (trimmed === "") return null;
  if (kind === "number") {
    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n;
  }
  if (kind === "percent") {
    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n / 100;
  }
  return trimmed;
}

/**
 * One labelled fact. Read-only display + source-icon tooltip; a pencil opens an
 * inline editor that calls updateFact and re-grades. Computed facts pass no
 * `field`/`edit` and render read-only.
 */
export function FactRow({
  leadId,
  field,
  label,
  value,
  provenance,
  edit,
}: {
  leadId: string;
  field?: LeadFactKey;
  label: string;
  value: ReactNode;
  provenance?: Provenance;
  edit?: EditConfig;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const icon = originIcon(provenance);

  const begin = () => {
    setDraft(edit?.raw ?? "");
    setEditing(true);
  };

  const save = () => {
    if (!field || !edit) return;
    startTransition(async () => {
      await updateFact(leadId, field, coerceValue(edit.coerce, draft));
      setEditing(false);
    });
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
      <div className="text-sm text-ink-500 font-medium w-32 shrink-0">{label}</div>

      {editing ? (
        <div className="flex items-center gap-1.5 flex-1">
          {edit?.type === "select" ? (
            <Select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9"
              autoFocus
            >
              {edit.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              type={edit?.type === "number" ? "number" : "text"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            aria-label="שמירה"
            className="w-9 h-9 inline-flex items-center justify-center rounded bg-go-500 text-white hover:bg-go-600 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faCheck} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="ביטול"
            className="w-9 h-9 inline-flex items-center justify-center rounded text-ink-400 hover:bg-surface-muted"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn("text-sm font-semibold text-ink-900 truncate")}>{value}</span>
          {icon && (
            <Tooltip content={provenance?.label ?? "מקור לא ידוע"}>
              <FontAwesomeIcon icon={icon} className="text-ink-400 text-xs" />
            </Tooltip>
          )}
          {field && edit && (
            <button
              type="button"
              onClick={begin}
              aria-label={`עריכת ${label}`}
              className="ms-auto w-8 h-8 inline-flex items-center justify-center rounded text-ink-400 hover:bg-surface-muted hover:text-brand-600 transition-colors"
            >
              <FontAwesomeIcon icon={faPen} className="text-xs" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faChartLine,
  faCircleCheck,
  faClock,
  faCity,
  faCoins,
  faFloppyDisk,
  faScaleBalanced,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { TagInput } from "./TagInput";
import { saveConfigAction } from "@/app/actions";
import { REGION_LABEL, Region, type TriageConfig } from "@/lib/domain/config";

/**
 * The settings editor. Holds the whole TriageConfig in local state and writes it
 * back via saveConfigAction. Every field is plainly labelled with helper text so
 * a non-technical manager understands what each number does.
 */
export function SettingsForm({ initial }: { initial: TriageConfig }) {
  const [config, setConfig] = useState<TriageConfig>(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Typed patch helper.
  const set = <K extends keyof TriageConfig>(key: K, value: TriageConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  };

  const save = () =>
    startTransition(async () => {
      await saveConfigAction(config);
      setSaved(true);
    });

  return (
    <div className="space-y-5 pb-24">
      {/* פינוי-בינוי thresholds */}
      <Section title="ספי פינוי-בינוי" icon={faBuilding}>
        <NumField
          label='מינימום יח"ד לפינוי-בינוי'
          help='מתחת לסף זה הליד נפסל אוטומטית (דגל קטלני).'
          value={config.pinuiBinuiMinUnits}
          onChange={(v) => set("pinuiBinuiMinUnits", v)}
        />
        <NumField
          label='מתחם קטן — עד יח"ד'
          help='בין המינימום לסף זה — מסומן כמתחם קטן (דגל כתום).'
          value={config.smallMitchamMaxUnits}
          onChange={(v) => set("smallMitchamMaxUnits", v)}
        />
        <NumField
          label='תמ"א 38/2 — מינימום יח"ד'
          value={config.tamaMinUnits}
          onChange={(v) => set("tamaMinUnits", v)}
        />
        <NumField
          label='תמ"א 38/2 — מקסימום יח"ד'
          help='מעל סף זה — הצעה לסווג מחדש כפינוי-בינוי.'
          value={config.tamaMaxUnits}
          onChange={(v) => set("tamaMaxUnits", v)}
        />
      </Section>

      {/* Density & multiplier */}
      <Section title="צפיפות ומכפיל" icon={faChartLine}>
        <NumField
          label='צפיפות נמוכה (יח"ד/דונם)'
          help="מתחת לסף זה — יש עתודת קרקע (דגל ירוק)."
          value={config.densityLowGreen}
          onChange={(v) => set("densityLowGreen", v)}
        />
        <NumField
          label="צפיפות גבוהה — כתום"
          value={config.densityHighYellow}
          onChange={(v) => set("densityHighYellow", v)}
        />
        <NumField
          label="צפיפות גבוהה — אדום"
          value={config.densityHighRed}
          onChange={(v) => set("densityHighRed", v)}
        />
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-ink-700 mb-2">
            מכפיל מינימלי לפי אזור
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.values(Region) as Region[]).map((region) => (
              <NumField
                key={region}
                label={REGION_LABEL[region]}
                step={0.1}
                value={config.multiplierFloor[region]}
                onChange={(v) =>
                  set("multiplierFloor", { ...config.multiplierFloor, [region]: v })
                }
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Developer share */}
      <Section title="חלק היזם" icon={faScaleBalanced}>
        <PctField
          label="חלק יזם — אדום מעל"
          help="חלק היזם מסך יח״ד היוצאות שמעליו נדלק דגל אדום."
          value={config.developerShareRed}
          onChange={(v) => set("developerShareRed", v)}
        />
        <PctField
          label="חלק יזם — קטלני מתחת"
          help="מתחת לחלק זה העסקה אינה כדאית (דגל קטלני)."
          value={config.developerShareKill}
          onChange={(v) => set("developerShareKill", v)}
        />
      </Section>

      {/* Deadlines */}
      <Section title="מועדי הגשה" icon={faClock}>
        <NumField
          label="מועד לא ריאלי — עד ימי עבודה"
          help="מתחת למספר זה — מועד ההגשה בלתי אפשרי (דגל אדום הניתן לריפוי)."
          value={config.deadlineImpossibleDays}
          onChange={(v) => set("deadlineImpossibleDays", v)}
        />
        <NumField
          label="מועד לחוץ — עד ימי עבודה"
          value={config.deadlineTightDays}
          onChange={(v) => set("deadlineTightDays", v)}
        />
      </Section>

      {/* Source fee */}
      <Section title="עמלת מקור" icon={faCoins}>
        <NumField
          label='עמלה ליח"ד — כתום מעל (₪)'
          value={config.feeYellowPerUnit}
          onChange={(v) => set("feeYellowPerUnit", v)}
        />
        <NumField
          label='עמלה ליח"ד — אדום מעל (₪)'
          value={config.feeRedPerUnit}
          onChange={(v) => set("feeRedPerUnit", v)}
        />
        <PctField
          label="אחוז מהעסקה — כתום מעל"
          value={config.feeYellowPct}
          onChange={(v) => set("feeYellowPct", v)}
        />
        <PctField
          label="אחוז מהעסקה — אדום מעל"
          value={config.feeRedPct}
          onChange={(v) => set("feeRedPct", v)}
        />
        <NumField
          label="סכום קבוע — כתום מעל (₪)"
          value={config.feeYellowFixed}
          onChange={(v) => set("feeYellowFixed", v)}
        />
        <NumField
          label="סכום קבוע — אדום מעל (₪)"
          value={config.feeRedFixed}
          onChange={(v) => set("feeRedFixed", v)}
        />
      </Section>

      {/* Score weights */}
      <Section title="משקלי ציון" icon={faSliders}>
        <p className="sm:col-span-2 text-sm text-ink-400 -mt-1 mb-1">
          משקל כל מדד בציון המשוקלל הסופי (סכום רצוי: 1).
        </p>
        <PctField
          label="כלכלה"
          value={config.weights.economics}
          onChange={(v) => set("weights", { ...config.weights, economics: v })}
        />
        <PctField
          label="תכנון"
          value={config.weights.planning}
          onChange={(v) => set("weights", { ...config.weights, planning: v })}
        />
        <PctField
          label="רצינות"
          value={config.weights.seriousness}
          onChange={(v) => set("weights", { ...config.weights, seriousness: v })}
        />
        <PctField
          label="אסטרטגיה"
          value={config.weights.strategic}
          onChange={(v) => set("weights", { ...config.weights, strategic: v })}
        />
        <PctField
          label="לוח זמנים"
          value={config.weights.timeline}
          onChange={(v) => set("weights", { ...config.weights, timeline: v })}
        />
        <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 pt-2 border-t border-line">
          <NumField
            label="סף המלצה 'להתקדם'"
            help="ציון שממנו ומעלה ההמלצה היא להתקדם."
            value={config.advanceAt}
            onChange={(v) => set("advanceAt", v)}
          />
          <NumField
            label="סף 'להחלטת הנהלה'"
            help="ציון שממנו ומעלה — להחלטת הנהלה; מתחתיו — לדחות."
            value={config.reviewAt}
            onChange={(v) => set("reviewAt", v)}
          />
        </div>
      </Section>

      {/* City lists */}
      <Section title="רשימות ערים" icon={faCity} grid={false}>
        <div className="space-y-4">
          <Field label="ערי יעד (Whitelist)" help="ערים שבהן BST מעוניינת לפעול.">
            <TagInput
              values={config.cityWhitelist}
              onChange={(v) => set("cityWhitelist", v)}
            />
          </Field>
          <Field label="ערים חסומות (Blacklist)" help="ערים שבהן איננו פועלים.">
            <TagInput
              values={config.cityBlacklist}
              onChange={(v) => set("cityBlacklist", v)}
            />
          </Field>
          <Field
            label="ערים המחייבות רישום במאגר"
            help="ערים שדורשות רישום במאגר יזמים."
          >
            <TagInput
              values={config.maagarRequiredCities}
              onChange={(v) => set("maagarRequiredCities", v)}
            />
          </Field>
          <Field
            label="ערים בהן אנו רשומים במאגר"
            help="ערים שבהן BST כבר רשומה במאגר היזמים."
          >
            <TagInput
              values={config.registeredMaagarCities}
              onChange={(v) => set("registeredMaagarCities", v)}
            />
          </Field>
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 inset-x-0 lg:inset-x-auto lg:end-8 lg:bottom-6 z-30">
        <div className="bg-surface border-t lg:border border-line lg:rounded-xl shadow-pop px-5 py-3 flex items-center justify-between gap-4 lg:gap-6">
          <span className="text-sm text-ink-500">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-go-700 font-semibold">
                <FontAwesomeIcon icon={faCircleCheck} />
                ההגדרות נשמרו
              </span>
            ) : (
              "שינויים שבוצעו יחולו על סינון הלידים"
            )}
          </span>
          <Button variant="primary" icon={faFloppyDisk} loading={pending} onClick={save}>
            שמירה
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- sub-fields ------------------------------- */

function Section({
  title,
  icon,
  children,
  grid = true,
}: {
  title: string;
  icon: IconDefinition;
  children: ReactNode;
  grid?: boolean;
}) {
  return (
    <Card>
      <CardHeader title={title} icon={icon} />
      <div className={grid ? "px-5 pb-5 grid gap-4 sm:grid-cols-2" : "px-5 pb-5"}>
        {children}
      </div>
    </Card>
  );
}

function NumField({
  label,
  help,
  value,
  onChange,
  step,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <Field label={label} help={help}>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="ltr-nums text-start"
        dir="ltr"
      />
    </Field>
  );
}

/** A percentage field stored as a 0..1 fraction but edited as a whole number. */
function PctField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} help={help}>
      <div className="relative">
        <Input
          type="number"
          step={1}
          value={Math.round(value * 100)}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value) / 100)
          }
          className="ltr-nums text-start pe-8"
          dir="ltr"
        />
        <span className="absolute top-1/2 -translate-y-1/2 end-3 text-ink-400 text-sm">%</span>
      </div>
    </Field>
  );
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHEVRON_WIDTH_REM,
  COLUMNS,
  SORT_ACCESSOR,
  WIDE_BREAKPOINT_PX,
  WIDTH_COMPACT,
  WIDTH_FULL,
  contentWidthRem,
  remOf,
} from "./leadColumns";

/**
 * Regression guards for the leads table's layout contract.
 *
 * Every case here corresponds to a failure that has actually happened in this
 * project and that neither TypeScript nor a build catches. They are cheap to
 * run and they fail loudly, which is the whole point: the table is the screen
 * the product lives on, and its breakages are silent and visual.
 */
describe("leads table column contract", () => {
  it("has unique column keys", () => {
    const keys = COLUMNS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every sortable column a sort accessor", () => {
    // Without this, clicking that header throws `SORT_ACCESSOR[key] is not a
    // function` — a runtime error on first interaction, invisible until then.
    const missing = COLUMNS.filter((c) => c.sortable && !SORT_ACCESSOR[c.key]);
    expect(missing.map((c) => c.key)).toEqual([]);
  });

  it("keeps optional columns last", () => {
    // Optional columns are dropped by filtering them out of COLUMNS. If one sat
    // in the middle, dropping it would shift every later column's <col> width
    // while the hand-written <tbody> cells stayed put — header and body would
    // silently disagree.
    const firstOptional = COLUMNS.findIndex((c) => c.optional);
    if (firstOptional === -1) return;
    expect(COLUMNS.slice(firstOptional).every((c) => c.optional)).toBe(true);
  });

  it("derives the table min-width from the column widths", () => {
    const full = COLUMNS.reduce((n, c) => n + remOf(c.width), CHEVRON_WIDTH_REM);
    const compact = COLUMNS.filter((c) => !c.optional).reduce(
      (n, c) => n + remOf(c.width),
      CHEVRON_WIDTH_REM,
    );
    expect(remOf(WIDTH_FULL)).toBeCloseTo(full, 4);
    expect(remOf(WIDTH_COMPACT)).toBeCloseTo(compact, 4);
  });

  it("fits a 1280px laptop once the optional columns are dropped", () => {
    // Overflow past the content column clips the LAST columns and the row
    // chevron off the RTL edge — the exact bug that shipped once already.
    expect(remOf(WIDTH_COMPACT)).toBeLessThanOrEqual(contentWidthRem(1280));
  });

  it("fits its own wide breakpoint with every column shown", () => {
    // The full set is only revealed above WIDE_BREAKPOINT_PX, so that
    // breakpoint has to be high enough to actually hold it. Adding a column
    // without raising the breakpoint reintroduces the clipping bug at the very
    // width that was supposed to be roomy.
    expect(remOf(WIDTH_FULL)).toBeLessThanOrEqual(contentWidthRem(WIDE_BREAKPOINT_PX));
  });

  it("gates exactly the optional columns behind the wide breakpoint", () => {
    // Each optional column's <td> must sit inside the `{wide && (...)}` block.
    // Leave one outside and, the moment the breakpoint drops its <col>, every
    // cell after it shifts one column left while the header stays put — a
    // header/body mismatch with no error anywhere.
    const src = readFileSync(resolve(__dirname, "LeadTable.tsx"), "utf8");
    const body = src.slice(src.indexOf("<tbody>"), src.indexOf("</tbody>"));
    const gated = body.slice(body.indexOf("{wide && ("), body.indexOf("</>"));
    const gatedCells = (gated.match(/<td\b/g) ?? []).length;
    expect(gatedCells).toBe(COLUMNS.filter((c) => c.optional).length);
  });

  it("keeps <tbody> cells in lockstep with COLUMNS", () => {
    // COLUMNS is data; the body cells are hand-written JSX in matching order.
    // Nothing ties them together at compile time, so count them in the source.
    const src = readFileSync(resolve(__dirname, "LeadTable.tsx"), "utf8");
    const body = src.slice(src.indexOf("<tbody>"), src.indexOf("</tbody>"));
    const cells = (body.match(/<td\b/g) ?? []).length;
    expect(cells).toBe(COLUMNS.length + 1); // +1 = the trailing chevron cell
  });
});

describe("leads table sort accessors", () => {
  it("sorts dates by timestamp, not by their rendered text", () => {
    // "29/07/2026" sorts before "24/07/2026" as a string. Any date column must
    // therefore expose a numeric accessor, not the display value.
    for (const key of ["received", "deadline"]) {
      const accessor = SORT_ACCESSOR[key];
      const value = accessor({ receivedTs: 1, deadlineTs: 1 } as never);
      expect(typeof value === "number" || value === null).toBe(true);
    }
  });

  it("sorts numeric columns numerically", () => {
    for (const key of ["density", "score", "unitsExisting", "unitsPlanned"]) {
      const value = SORT_ACCESSOR[key]({
        densityNum: 2,
        score: 2,
        unitsExistingNum: 2,
        unitsPlannedNum: 2,
      } as never);
      expect(typeof value === "number" || value === null).toBe(true);
    }
  });
});

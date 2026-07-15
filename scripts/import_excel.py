#!/usr/bin/env python3
"""
Import פיתוח עסקי.xlsx (5 sheets) → data/seed/leads.json.

Maps each row onto the Lead schema field names (the contract between this
parser and lib/domain). Active rows keep their inferred pipeline stage;
inactive rows become status="closed" (the archive). Excel serial dates and
Hebrew string dates are both normalised to ISO.

Run: npm run import:excel
"""
import json
import re
import zipfile
import datetime as dt
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT.parent / "BST_files" / "פיתוח עסקי.xlsx"
OUT = ROOT / "data" / "seed" / "leads.json"

M = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
EXCEL_EPOCH = dt.date(1899, 12, 30)  # Excel 1900 system, accounting for the leap bug


def col_letter(ref: str) -> str:
    return re.match(r"[A-Z]+", ref).group(0)


def load_sheet(z, strings, index):
    root = ET.fromstring(z.read(f"xl/worksheets/sheet{index}.xml"))
    rows = []
    for row in root.find(M + "sheetData").findall(M + "row"):
        cells = {}
        for c in row.findall(M + "c"):
            v = c.find(M + "v")
            if v is None or v.text is None:
                continue
            val = v.text
            if c.get("t") == "s":
                val = strings[int(val)]
            cells[col_letter(c.get("r"))] = val
        rows.append(cells)
    return rows


def to_iso(raw):
    if raw is None:
        return None
    raw = str(raw).strip()
    if not raw or raw in ("-", "—"):
        return None
    # Excel serial number
    if re.fullmatch(r"\d{4,6}", raw):
        try:
            d = EXCEL_EPOCH + dt.timedelta(days=int(raw))
            return d.isoformat()
        except Exception:
            return None
    # dd.mm.yy / dd.mm.yyyy / dd/mm/...
    for sep in (".", "/"):
        parts = raw.split(sep)
        if len(parts) == 3 and all(p.strip().isdigit() for p in parts):
            dd, mm, yy = (int(p) for p in parts)
            if yy < 100:
                yy += 2000
            try:
                return dt.date(yy, mm, dd).isoformat()
            except ValueError:
                return None
    return None


def num(raw):
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "")
    if not s or s in ("-", "—"):
        return None
    m = re.search(r"-?\d+(\.\d+)?", s)
    return float(m.group(0)) if m else None


def is_active(raw):
    return raw is not None and "לא" not in str(raw)


def slug(*parts):
    base = "-".join(str(p) for p in parts if p)
    base = re.sub(r"[^\w֐-׿]+", "-", base).strip("-")
    return base[:80] or "lead"


def stage(active, dates):
    """Infer pipeline status from which workflow dates are populated."""
    if not active:
        return "closed"
    offer, econ, arch, planres, plansent = dates
    if offer:
        return "offer_submitted"
    if econ:
        return "economic_check"
    if arch:
        return "questionnaire"
    if planres or plansent:
        return "planning_check"
    return "triage"


def base_lead(deal_type, name, city, active, received, deadline, notes, extra, dates):
    return {
        "id": None,  # filled by caller
        "dealType": deal_type,
        "projectName": (name or "ללא שם").strip(),
        "city": (city or None) and city.strip(),
        "address": None,
        "gushHelka": [],
        "sourceType": None,
        "contact": None,
        "status": stage(active, dates),
        "leadReceivedAt": received,
        "submissionDeadline": deadline,
        "notes": (notes or "").strip(),
        "unitsExisting": None,
        "unitsPlanned": None,
        "developerUnits": None,
        "lotAreaDunam": None,
        "shops": None,
        "planStatus": "unknown",
        "planNumber": None,
        "signaturePct": None,
        "publicHousingPct": None,
        "registeredInMaagar": None,
        "sourceFee": None,
        "sentToPlanningAt": dates[4],
        "planningResultAt": dates[3],
        "sentToArchitectAt": dates[2],
        "sentToEconomicsAt": dates[1],
        "offerAt": dates[0],
        "active": active,
        "extra": extra,
    }


def parse_pinui(rows):
    out = []
    for r in rows:
        if not r.get("C") and not r.get("D"):
            continue
        if r.get("B") in ("פעיל/לא פעיל ", "פעיל", "לא פעיל") and not r.get("D"):
            continue  # header/legend row
        active = is_active(r.get("B"))
        dates = (
            to_iso(r.get("R")),  # offer
            to_iso(r.get("Q")),  # economics
            to_iso(r.get("P")),  # architect
            to_iso(r.get("N")),  # planning result
            to_iso(r.get("L")),  # planning sent
        )
        lead = base_lead(
            "pinui_binui", r.get("D"), r.get("C"), active,
            to_iso(r.get("E")), to_iso(r.get("F")), r.get("K"), {}, dates,
        )
        lead["unitsExisting"] = num(r.get("G"))
        lead["unitsPlanned"] = num(r.get("H"))
        lead["developerUnits"] = num(r.get("I"))
        lead["shops"] = num(r.get("M"))
        if r.get("J"):
            lead["contact"] = {"name": str(r["J"]).strip(), "firm": None, "email": None, "phone": None}
        out.append(lead)
    return out


def parse_tama(rows):
    out = []
    for r in rows:
        if not r.get("C") and not r.get("D"):
            continue
        if not r.get("D"):
            continue
        active = is_active(r.get("B"))
        dates = (to_iso(r.get("M")), to_iso(r.get("L")), None, None, None)
        lead = base_lead(
            "tama_38_2", r.get("D"), r.get("C"), active,
            to_iso(r.get("E")), None, r.get("N"), {}, dates,
        )
        lead["unitsExisting"] = num(r.get("F"))
        lead["unitsPlanned"] = num(r.get("G"))
        lead["developerUnits"] = num(r.get("H"))
        lead["shops"] = num(r.get("J"))
        if r.get("I"):
            lead["contact"] = {"name": str(r["I"]).strip(), "firm": None, "email": None, "phone": None}
        out.append(lead)
    return out


def parse_initiative(rows):
    out = []
    for r in rows:
        if not r.get("D") and not r.get("E"):
            continue
        if not r.get("E"):
            continue
        active = is_active(r.get("B"))
        dates = (
            to_iso(r.get("U")), to_iso(r.get("T")), to_iso(r.get("S")),
            to_iso(r.get("Q")), to_iso(r.get("P")),
        )
        extra = {"projectKind": r.get("C"), "offices": r.get("K"), "commerce": r.get("L"), "hotel": r.get("N")}
        lead = base_lead(
            "initiative", r.get("E"), r.get("D"), active,
            to_iso(r.get("F")), to_iso(r.get("G")), r.get("J"), extra, dates,
        )
        lead["unitsExisting"] = num(r.get("I"))
        lead["shops"] = num(r.get("M"))
        if r.get("H"):
            lead["contact"] = {"name": str(r["H"]).strip(), "firm": None, "email": None, "phone": None}
        out.append(lead)
    return out


def parse_rami(rows):
    out = []
    for r in rows:
        if not r.get("C") or not r.get("D"):
            continue
        if r.get("C") == "מס' מכרז":
            continue
        status = str(r.get("O") or "").strip()
        active = status not in ("נסגר", "בוטל")
        extra = {
            "tenderNumber": r.get("C"),
            "tenderType": r.get("E"),
            "totalUnits": num(r.get("H")),
            "freeMarketUnits": num(r.get("I")),
            "reducedPriceUnits": num(r.get("K")),
            "status": status,
            "openDate": to_iso(r.get("F")),
        }
        dates = (None, None, None, None, None)
        lead = base_lead(
            "rami_tender", f"מכרז {r.get('C')}", r.get("D"), active,
            to_iso(r.get("F")), to_iso(r.get("L")), None, extra, dates,
        )
        lead["unitsExisting"] = None
        out.append(lead)
    return out


def parse_external(rows):
    out = []
    for r in rows:
        if not r.get("C") and not r.get("D") and not r.get("E"):
            continue
        if r.get("A") == 'מס"ד':
            continue
        active = is_active(r.get("K"))
        lead = base_lead(
            "external_offer", r.get("C") or r.get("E") or "הצעה", r.get("D"), active,
            None, None, r.get("J"), {"kind": r.get("B"), "address": r.get("E")}, (None, None, None, None, None),
        )
        lead["unitsPlanned"] = num(r.get("F"))
        lead["developerUnits"] = num(r.get("G"))
        lead["shops"] = num(r.get("H"))
        if r.get("I"):
            lead["contact"] = {"name": str(r["I"]).strip(), "firm": None, "email": None, "phone": None}
        out.append(lead)
    return out


def sanitize(lead):
    """Repair the known source-Excel defects (e.g. negative דירות יזם where
    יח"ד יוצאות was blank). Invalid derived numbers → null so the app recomputes."""
    du = lead.get("developerUnits")
    up = lead.get("unitsPlanned")
    if du is not None and (du < 0 or (up is not None and du > up)):
        lead["developerUnits"] = None
    ue = lead.get("unitsExisting")
    if ue is not None and ue < 0:
        lead["unitsExisting"] = None


def main():
    z = zipfile.ZipFile(XLSX)
    ss = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings = ["".join(t.text or "" for t in si.iter(M + "t")) for si in ss.findall(M + "si")]

    wb = ET.fromstring(z.read("xl/workbook.xml"))
    names = [s.get("name").strip() for s in wb.find(M + "sheets")]

    parsers = {
        "יזמות": parse_initiative,
        "פינוי בינוי": parse_pinui,
        "תמא 38-2": parse_tama,
        'מכרזי רמ"י': parse_rami,
        "הצעות בחוץ": parse_external,
    }

    leads = []
    for i, name in enumerate(names, start=1):
        parser = parsers.get(name)
        if not parser:
            continue
        rows = load_sheet(z, strings, i)
        parsed = parser(rows)
        for j, lead in enumerate(parsed):
            lead["id"] = f"{slug(name, j, lead['projectName'], lead.get('city'))}"
            sanitize(lead)
            leads.append(lead)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(leads, ensure_ascii=False, indent=2), encoding="utf-8")

    active = sum(1 for l in leads if l["active"])
    print(f"Wrote {len(leads)} leads → {OUT.relative_to(ROOT)}  ({active} active / {len(leads) - active} archive)")
    by_type = {}
    for l in leads:
        by_type[l["dealType"]] = by_type.get(l["dealType"], 0) + 1
    for k, v in sorted(by_type.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build docs/planning/data.js from the month's master timetable.

  python3 scripts/build_planning.py <Master.xlsx> <YYYY-MM> "<Label>" <requests.json>

The master must have cached values (open + save it in Excel, or convert with LibreOffice).
requests.json holds the month's hand-written parts: swaps, tags, notes, banner (see docs/planning/requests-2026-12.json).
"""
import json, sys, datetime, openpyxl

master, month, label, reqfile = sys.argv[1:5]
req = json.load(open(reqfile, encoding="utf-8"))
wb = openpyxl.load_workbook(master, data_only=True)
SL = [r for r in wb["Session List"].iter_rows(min_row=2, values_only=True) if r[0]]
PT = [r for r in wb["PT Sessions"].iter_rows(min_row=2, values_only=True) if r[0]]
iso = lambda d: datetime.datetime.strptime(d, "%d/%m/%Y").strftime("%Y-%m-%d")
key = lambda r: f"{iso(r[1])}_{r[3].replace(':', '')}_{r[5].replace(' ', '-')}"

coaches = {}
for cid, c in req["coaches"].items():
    code = c["master"]
    rows = [("Cours collectif", r) for r in SL if r[8] == code] + [("1:1", r) for r in PT if r[8] == code]
    rows.sort(key=lambda x: (iso(x[1][1]), x[1][3]))
    sessions, swaps = [], []
    for typ, r in rows:
        k = key(r)
        s = {"key": k, "wk": r[0], "date": iso(r[1]), "day": r[2], "s": r[3], "e": r[4], "cl": r[5], "typ": typ}
        ask = c.get("swaps", {}).get(k)
        if ask:
            if ask.get("from"): s["from"] = ask["from"]
            s["why"] = ask["why"]; swaps.append(k)
        if k in c.get("tags", {}): s["tag"] = c["tags"][k]
        sessions.append(s)
    missing = set(c.get("swaps", {})) - set(swaps)
    assert not missing, (cid, missing)
    coaches[cid] = {"name": c["name"], "sessions": sessions, "swaps": swaps, "file": c.get("file")}

allrows = [{"date": iso(r[1]), "day": r[2], "s": r[3], "e": r[4], "cl": r[5], "coach": r[8]} for r in SL]
out = {"month": month, "label": label, "banner": req.get("banner"), "coaches": coaches, "all": allrows, "notes": req.get("notes", {})}
open("docs/planning/data.js", "w", encoding="utf-8").write("window.PLANNING = " + json.dumps(out, ensure_ascii=False) + ";\n")
for cid, c in coaches.items(): print(cid, len(c["sessions"]), "séances,", len(c["swaps"]), "demandes")

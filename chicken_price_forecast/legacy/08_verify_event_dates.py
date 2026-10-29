"""Step 08 - external spot-check of future event dates.

The supplied calendar already records its own sources (Drik Panchang for Hindu
dates, a published India holiday calendar for Islamic dates, IMD season norms).
This step records an independent second-source check of the 2027 dates that
matter most for the forecast, so the report can say which dates were verified
twice and which remain provisional.

Checked on 2026-10-28 against Office Holidays (India, 2027) which republishes
state-wise gazetted holiday dates, including Uttar Pradesh.
"""
from __future__ import annotations

import pandas as pd

import cplib as cp

et = cp.load_event_calendar()

verified = {
    # definition_id: (date checked, independent source date, source url)
    "diwali-window": ("2027-10-27/2027-10-31", "Diwali: Fri 29 Oct 2027 (Uttar Pradesh)",
                      "https://www.officeholidays.com/holidays/india/diwali"),
    "holi": ("2027-03-21/2027-03-22", "Holika Dahan Sun 21 Mar, Holi Mon 22 Mar 2027",
             "https://www.officeholidays.com/countries/india/2027"),
    "eid-ul-fitr": ("2027-03-08/2027-03-10", "Idul Fitr: Tue 09 Mar 2027",
                    "https://www.officeholidays.com/countries/india/2027"),
    "eid-ul-adha": ("2027-05-15/2027-05-17", "Bakrid: Mon 17 May 2027",
                    "https://www.officeholidays.com/countries/india/2027"),
    "maha-shivaratri": ("2027-03-06", "Maha Shivratri: Sat 06 Mar 2027",
                        "https://www.officeholidays.com/countries/india/2027"),
    "muharram": ("2027-06-16", "Ashura (10 Muharram): Wed 16 Jun 2027",
                 "https://www.officeholidays.com/countries/india/2027"),
}

rows = []
for eid in sorted(et.occurrences.loc[et.occurrences.year == 2027, "definition_id"].unique()):
    o = et.occurrences[(et.occurrences.definition_id == eid) & (et.occurrences.year == 2027)].iloc[0]
    start, end = o.start_date.date().isoformat(), o.end_date.date().isoformat()
    win = start if start == end else f"{start}/{end}"
    if eid in verified:
        checked, external, url = verified[eid]
        status = "independently confirmed" if checked == win else "checked, differs from calendar"
    else:
        external, url = "", ""
        status = "not independently re-checked; use supplied calendar label"
    rows.append({
        "definition_id": eid,
        "calendar_start": o.start_date.date().isoformat(),
        "calendar_end": o.end_date.date().isoformat(),
        "calendar_date_confidence": o.date_confidence,
        "external_check": external,
        "external_source": url,
        "verification_status": status,
    })

out = pd.DataFrame(rows)
cp.write_table(out, "event_date_verification.csv")
cp.json_dump({"checked_on": "2026-10-28",
              "method": "manual cross-check against a public India holiday calendar (state-level, UP included)",
              "n_2027_events": int(len(out)),
              "n_confirmed": int((out.verification_status == "independently confirmed").sum()),
              "n_unchecked": int((out.verification_status.str.startswith("not independently")).sum())},
             "event_date_verification.json")

print(out[["definition_id", "calendar_start", "calendar_end", "calendar_date_confidence",
           "verification_status"]].to_string(index=False))

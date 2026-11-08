#!/usr/bin/env python3
"""Build the TNEA Compass seed dataset from the archived source exports.

The source directory is expected to contain the exports from the original
TNEA project:

    imports/json/colleges_2023.json
    imports/json/branches_2023.json
    imports/json/branch_master_2023.json
    imports/json/tnea_cutoffs_all_years.json
    imports/json/cutoffs_2025.json
    imports/json/hostel_2023.json
    imports/json/fee_structure_2023.json
    imports/json/facilities_2023.json
    imports/output/Information_about_colleges.txt
    imports/raw_html/*.html

Run:

    python3 scripts/etl.py --source /path/to/imports --out data/seed

The output is a set of gzipped NDJSON files plus a manifest. The seed files
are committed so a fresh checkout can seed the database without the original
70 MB of source exports.
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

COMMUNITIES = ["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"]
UNIVERSITY_CODES = {"0001", "0002", "0003", "0004", "0005"}

# The source uses a handful of codes twice. These aliases reproduce the
# canonical college codes used by the live TNEA data.
COLLEGE_ALIASES = {
    "2008": "0001",  # CEG
    "2019": "0005",  # Annamalai
    "2900": "2373",  # Hindusthan School of Architecture
    "3500": "1129",  # Jaya School of Architecture
}

# For records that only carry a code (hostel/fee/facilities), assign the
# record to the primary college when a source code was shared.
GENERIC_ALIASES = {
    "2008": "0001",
    "2019": "0005",
    "2900": "2373",
    "3500": "1129",
    "2007": "2007",  # CIT (the second 2007 record)
    "2022": "0004",  # MIT (the second 2022 record)
    "3000": "1135",  # Aalim (the second 3000 record)
}

# 2007 is shared by ACT and CIT in the source branch table.
ACT_ONLY = {"AP", "CR", "FS", "IB", "IS", "LE", "PM", "PP", "TX"}
CIT_ONLY = {"AT", "CE", "CM", "CN", "CS", "EC", "EE", "EM", "EY", "IM", "ME", "MF"}
SHARED_2007 = {"CH", "CL"}

# 2022 is shared by the School of Architecture and Planning and MIT.
SAP_ONLY = {"AR", "BA", "BP"}

DISTRICT_FIXES = {
    "P": "Puducherry",
}

COLLEGE_NAME_OVERRIDES = {
    "0001": "University Departments of Anna University, Chennai - CEG Campus, Sardar Patel Road, Guindy, Chennai 600 025",
    "0002": "University Departments of Anna University, Chennai - ACT Campus, Sardar Patel Road, Guindy, Chennai 600 025",
    "0003": "School of Architecture and Planning, Anna University, Chennai 600 025",
    "0004": "University Departments of Anna University, Chennai - MIT Campus, Chrompet, Tambaram Taluk, Chengalpattu District 600 044",
    "0005": "Annamalai University Faculty of Engineering and Technology, Annamalai Nagar, Cuddalore",
    "2621": "Er. Perumal Manimekalai College of Engineering (Autonomous), Near Koneripalli, Hosur, Krishnagiri District 635117",
    "2717": "Sasurie College of Engineering, Vijayamangalam, Tiruppur District 638056",
    "3809": "Kurinji College of Engineering and Technology, Manapparai, Tiruchirappalli District 621307",
    "5012": "Central Electrochemical Research Institute (CECRI), Karaikudi, Sivagangai District 630006",
}

SHORT_NAME_OVERRIDES = {
    "0001": "College of Engineering, Guindy (CEG)",
    "0002": "Alagappa College of Technology (ACT)",
    "0003": "School of Architecture and Planning",
    "0004": "Madras Institute of Technology (MIT)",
    "0005": "Annamalai University Faculty of Engineering",
}

MISSING_COLLEGES = {
    # code: (district, autonomous)
    "2621": ("KRISHNAGIRI", True),
    "2717": ("TIRUPPUR", False),
    "3809": ("TIRUCHIRAPPALLI", False),
}

# Canonical branch names. The source branch list has a few PDF extraction
# artefacts ("lii", a merged MC/MZ row) and many abbreviations. These names
# are the display names used throughout the app.
BRANCH_NAMES = {
    "AD": "Artificial Intelligence and Data Science",
    "AE": "Aeronautical Engineering",
    "AG": "Agricultural Engineering",
    "AI": "Artificial Intelligence",
    "AL": "Artificial Intelligence and Machine Learning",
    "AM": "Computer Science and Engineering (AI and Machine Learning)",
    "AO": "Aerospace Engineering",
    "AP": "Apparel Technology (SS)",
    "AR": "Architecture",
    "AS": "Automobile Engineering (SS)",
    "AT": "Artificial Intelligence and Data Science (SS)",
    "AU": "Automobile Engineering",
    "BA": "Architecture (SS)",
    "BC": "Bio Technology and Bio Chemical Engineering",
    "BD": "Computer Science and Engineering (Big Data Analytics)",
    "BM": "Bio-Medical Engineering",
    "BS": "Bio Technology (SS)",
    "BT": "Bio Technology",
    "BY": "Bio-Medical Engineering (SS)",
    "CA": "Computer Science and Engineering (Artificial Intelligence)",
    "CB": "Computer Science and Business Systems",
    "CC": "Chemical and Electro Chemical Engineering (SS)",
    "CD": "Computer Science and Design",
    "CE": "Civil Engineering",
    "CF": "Computer Science and Engineering (Data Science)",
    "CG": "Computer Science and Engineering (Artificial Intelligence and Machine Learning) (SS)",
    "CH": "Chemical Engineering",
    "CI": "Computer Science and Engineering (Internet of Things)",
    "CJ": "M.Tech. Computer Science and Engineering (Integrated 5 Years)",
    "CK": "Civil Engineering (Environmental Engineering)",
    "CL": "Chemical Engineering (SS)",
    "CM": "Computer Science and Engineering (SS)",
    "CN": "Civil Engineering (SS)",
    "CO": "Computer and Communication Engineering",
    "CP": "Civil Engineering and Planning",
    "CR": "Ceramic Technology (SS)",
    "CS": "Computer Science and Engineering",
    "CT": "Computer Technology",
    "CW": "Computer Science and Business Systems (SS)",
    "CY": "Cyber Security",
    "DA": "Bachelor of Design",
    "EA": "Electronics and Communication (Advanced Communication Technology)",
    "EC": "Electronics and Communication Engineering",
    "EE": "Electrical and Electronics Engineering",
    "EF": "Electrical and Computer Engineering",
    "EI": "Electronics and Instrumentation Engineering",
    "EL": "Electronics Engineering (VLSI Design and Technology) (SS)",
    "EM": "Electronics and Communication Engineering (SS)",
    "EN": "Environmental Engineering",
    "ES": "Electrical and Electronics Engineering (Sandwich) (SS)",
    "ET": "Electronics and Telecommunication Engineering",
    "EV": "Electronics Engineering (VLSI Design and Technology)",
    "EX": "Electronics and Instrumentation Engineering (SS)",
    "EY": "Electrical and Electronics Engineering (SS)",
    "FD": "Food Technology",
    "FS": "Food Technology (SS)",
    "FT": "Fashion Technology",
    "FY": "Fashion Technology (SS)",
    "GI": "Geo-Informatics",
    "HT": "Handloom and Textile Technology",
    "IB": "Industrial Bio-Technology",
    "IC": "Instrumentation and Control Engineering",
    "ID": "Interior Design (SS)",
    "IE": "Industrial Engineering",
    "IG": "Information Science and Engineering",
    "IM": "Information Technology (SS)",
    "IN": "Industrial Engineering and Management",
    "IS": "Industrial Bio-Technology (SS)",
    "IT": "Information Technology",
    "IX": "Electronic Instrumentation and Control Engineering",
    "IY": "Instrumentation and Control Engineering (SS)",
    "LE": "Leather Technology",
    "MA": "Material Science and Engineering (SS)",
    "MB": "Mechanical Engineering (Automobile)",
    "MC": "Mechatronics",
    "MD": "Medical Electronics Engineering",
    "ME": "Mechanical Engineering",
    "MF": "Mechanical Engineering (SS)",
    "MG": "Mechatronics (SS)",
    "MH": "Mechanical Engineering (Sandwich)",
    "MI": "Mining Engineering",
    "MJ": "Mechanical and Smart Manufacturing",
    "MN": "Manufacturing Engineering",
    "MO": "Mechanical and Mechatronics Engineering (Additive Manufacturing)",
    "MR": "Marine Engineering",
    "MS": "Mechanical Engineering (Sandwich) (SS)",
    "MT": "Metallurgical Engineering",
    "MU": "Mechanical and Automation Engineering",
    "MY": "Metallurgical Engineering (SS)",
    "MZ": "Mechatronics Engineering",
    "NS": "Nano Science and Technology",
    "PA": "Plastic Technology",
    "PC": "Petro Chemical Technology",
    "PD": "Petrochemical Engineering",
    "PE": "Petroleum Engineering",
    "PH": "Pharmaceutical Technology",
    "PL": "Polymer Technology",
    "PM": "Pharmaceutical Technology (SS)",
    "PN": "Production Engineering (SS)",
    "PP": "Petroleum Engineering and Technology (SS)",
    "PR": "Production Engineering",
    "PS": "Production Engineering (Sandwich) (SS)",
    "PT": "Printing and Packaging Technology",
    "PU": "Pharmaceutical Engineering",
    "RA": "Robotics and Automation (SS)",
    "RM": "Robotics and Automation",
    "RP": "Rubber and Plastic Technology",
    "SB": "Computer Science and Engineering (Internet of Things and Cyber Security including Block Chain Technology)",
    "SC": "Computer Science and Engineering (Cyber Security)",
    "SE": "Information Science and Engineering",
    "SF": "Safety and Fire Engineering",
    "TC": "Textile Chemistry",
    "TS": "Computer Science and Technology",
    "TT": "Textile Technology (SS)",
    "TX": "Textile Technology",
    "XC": "Civil Engineering (Tamil Medium)",
    "XM": "Mechanical Engineering (Tamil Medium)",
    "XS": "Computer Science and Engineering (Tamil)",
    # Codes that appear in the branch table but have no published name.
    "BF": "Not reported",
    "BP": "Not reported",
    "CZ": "Not reported",
    "MM": "Not reported",
}


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    return re.sub(r"\s+", " ", str(value)).strip()


def clean_name(value: Any) -> str:
    if value is None:
        return ""
    value = re.sub(r"\s+", " ", str(value)).strip()
    value = value.rstrip(",;-").strip()
    return value


def title_district(value: Any) -> str | None:
    value = clean_text(value)
    if not value:
        return None
    return DISTRICT_FIXES.get(value.upper(), value.title())


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def map_college_code(raw_code: Any, name: str = "") -> str:
    """Map a raw source code to a canonical college code."""
    raw = str(raw_code).strip()
    upper = (name or "").upper()
    if raw in COLLEGE_ALIASES:
        return COLLEGE_ALIASES[raw]
    if raw == "2007":
        return "0002" if "ACT CAMPUS" in upper else "2007"
    if raw == "2022":
        return "0004" if "MIT CAMPUS" in upper else "0003"
    if raw == "3000":
        return "5012" if "CECRI" in upper else "1135"
    return raw


def map_generic_code(raw_code: Any) -> str:
    raw = str(raw_code).strip()
    return GENERIC_ALIASES.get(raw, raw)


def derive_short_name(code: str, name: str) -> str:
    if code in SHORT_NAME_OVERRIDES:
        return SHORT_NAME_OVERRIDES[code]
    parts = [part.strip() for part in name.split(",") if part.strip()]
    if not parts:
        return name
    first = parts[0]
    if first.lower().startswith(("university college of engineering", "government college of engineering", "government engineering college")):
        short = f"{first}, {parts[1]}" if len(parts) > 1 else first
    else:
        short = first
    short = re.sub(r"\s*\(Autonomous\)\s*$", "", short, flags=re.I)
    short = re.sub(r"\s*\(Formerly[^)]*\)\s*$", "", short, flags=re.I)
    return short.strip(" ,-") or name


def parse_listing_names(text_path: Path) -> dict[str, str]:
    """Parse the alphabetical college index in the source PDF text."""
    lines = text_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    start, end = 2492, 4909
    names: dict[str, str] = {}
    i = 0
    while i < end - start:
        index = start + i
        serial = lines[index].strip()
        if re.fullmatch(r"\d{1,3}", serial):
            j = index + 1
            while j < end and not lines[j].strip():
                j += 1
            code = lines[j].strip() if j < end else ""
            if re.fullmatch(r"\d{4}", code):
                k = j + 1
                parts: list[str] = []
                while k < end:
                    value = lines[k].strip()
                    if re.fullmatch(r"\d{1,3}|-", value):
                        break
                    if value:
                        parts.append(value)
                    k += 1
                name = clean_name(" ".join(parts))
                if name and code not in names:
                    names[code] = name
                i = k - start
                continue
        i += 1
    return names


def parse_college_types(text_path: Path) -> dict[str, str]:
    lines = text_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    sections = [
        ("Government", 122, 178),
        ("Government Aided", 179, 294),
        ("Self-Financing", 295, 2491),
    ]
    result: dict[str, str] = {}
    for label, start, end in sections:
        for line in lines[start:end]:
            code = line.strip()
            if re.fullmatch(r"\d{4}", code):
                result.setdefault(code, label)
    for code in UNIVERSITY_CODES:
        result[code] = "University Department"
    return result


def write_ndjson(path: Path, rows: list[dict[str, Any]]) -> None:
    payload = "".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
        for row in rows
    ).encode("utf-8")
    with path.open("wb") as raw:
        # mtime=0 keeps the committed seed files byte-for-byte reproducible.
        with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as handle:
            handle.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Path to the original imports directory")
    parser.add_argument("--out", default="data/seed", help="Output directory (default: data/seed)")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)

    colleges_raw = read_json(source / "json/colleges_2023.json")
    branches_raw = read_json(source / "json/branches_2023.json")
    cutoffs_all = read_json(source / "json/tnea_cutoffs_all_years.json")
    cutoffs_2025 = read_json(source / "json/cutoffs_2025.json")
    hostels_raw = read_json(source / "json/hostel_2023.json")
    fees_raw = read_json(source / "json/fee_structure_2023.json")
    facilities_raw = read_json(source / "json/facilities_2023.json")

    text_path = source / "output/Information_about_colleges.txt"
    listing_names = parse_listing_names(text_path)
    college_types = parse_college_types(text_path)

    # ---------------------------------------------------------------- colleges
    colleges: dict[str, dict[str, Any]] = {}

    def add_college(
        code: str,
        name: str,
        district: str | None,
        autonomous: bool | None,
        *,
        type_label: str | None = None,
        transport: bool | None = None,
    ) -> None:
        if code in colleges:
            raise SystemExit(f"duplicate canonical college code: {code} ({name})")
        clean = clean_name(COLLEGE_NAME_OVERRIDES.get(code, name))
        colleges[code] = {
            "code": code,
            "name": clean,
            "shortName": derive_short_name(code, clean),
            "district": title_district(district),
            "type": type_label or college_types.get(code, "Self-Financing"),
            "autonomous": autonomous,
            # The source's minority flag is a placeholder (all false), so it
            # is deliberately not treated as reported data.
            "minority": None,
            "address": None,
            "taluk": None,
            "pincode": None,
            "phone": None,
            "email": None,
            "website": None,
            "establishedYear": None,
            "transportAvailable": transport,
        }

    for row in colleges_raw:
        raw_code = str(row["tnea_code"]).strip()
        raw_name = clean_name(row.get("name"))
        code = map_college_code(raw_code, raw_name)
        name = listing_names.get(code) or raw_name
        add_college(
            code,
            name,
            row.get("district"),
            bool(row.get("autonomous")) if row.get("autonomous") is not None else None,
        )

    for code, (district, autonomous) in MISSING_COLLEGES.items():
        name = listing_names.get(code)
        if not name:
            raise SystemExit(f"missing listing name for {code}")
        add_college(code, name, district, autonomous)

    # Attach transport availability. Where a raw code was shared, only the
    # primary college receives the record (the other is left Not reported).
    for row in facilities_raw:
        code = map_generic_code(row["tnea_code"])
        if code in colleges and colleges[code]["transportAvailable"] is None:
            colleges[code]["transportAvailable"] = bool(row.get("has_transport"))

    if len(colleges) != 450:
        raise SystemExit(f"expected 450 colleges, got {len(colleges)}")

    # ---------------------------------------------------------------- branches
    branch_codes = set(BRANCH_NAMES)
    for row in branches_raw:
        branch_codes.add(str(row["branch_code"]).strip().upper())
    for row in cutoffs_all:
        if "branch_code" in row:
            branch_codes.add(str(row["branch_code"]).strip().upper())
    for row in cutoffs_2025:
        branch_codes.add(str(row["branch_code"]).strip().upper())

    branches = [
        {"code": code, "name": BRANCH_NAMES.get(code, "Not reported")}
        for code in sorted(branch_codes)
    ]

    # ----------------------------------------------------------- college branches
    # One row per (college, branch) except PERI (1452), which has two distinct
    # programmes sharing the AM code.
    cb: dict[tuple[str, str], dict[str, Any]] = {}
    cb_extra: dict[tuple[str, str], dict[str, Any]] = {}

    def add_cb(
        college_code: str,
        branch_code: str,
        *,
        branch_name: str | None = None,
        intake: int | None = None,
        year_started: int | None = None,
        nba: bool | None = None,
        nba_valid: int | None = None,
        extra: bool = False,
    ) -> dict[str, Any]:
        code = str(branch_code).strip().upper()
        name = branch_name or BRANCH_NAMES.get(code, "Not reported")
        key = (college_code, code)
        target = cb_extra if extra else cb
        record = target.get(key)
        if record is None:
            record = {
                "collegeCode": college_code,
                "branchCode": code,
                "branchName": name,
                "approvedIntake": intake,
                "yearStarted": year_started,
                "nba": nba,
                "nbaValidUpto": nba_valid,
            }
            target[key] = record
        else:
            if record["approvedIntake"] is None:
                record["approvedIntake"] = intake
            if record["yearStarted"] is None:
                record["yearStarted"] = year_started
            if record["nba"] is None:
                record["nba"] = nba
            if record["nbaValidUpto"] is None:
                record["nbaValidUpto"] = nba_valid
        return record

    shared_counts: Counter[str] = Counter()
    for row in branches_raw:
        raw_code = str(row["college_code"]).strip()
        branch_code = str(row["branch_code"]).strip().upper()
        college_code = map_college_code(raw_code)
        if raw_code == "2007":
            if branch_code in CIT_ONLY:
                college_code = "2007"
            elif branch_code in ACT_ONLY:
                college_code = "0002"
            elif branch_code in SHARED_2007:
                shared_counts[branch_code] += 1
                college_code = "2007" if shared_counts[branch_code] == 1 else "0002"
        elif raw_code == "2022":
            college_code = "0003" if branch_code in SAP_ONLY else "0004"
        elif raw_code == "3000":
            college_code = "5012" if branch_code == "CC" else "1135"
        add_cb(
            college_code,
            branch_code,
            intake=row.get("approved_intake"),
            year_started=row.get("year_started"),
            nba=bool(row["nba"]) if row.get("nba") is not None else None,
            nba_valid=row.get("nba_valid_upto"),
        )

    def is_peri_ai_only(name: str) -> bool:
        upper = (name or "").upper()
        return "ARTIFICIAL INTELLIGENCE" in upper and "MACHINE LEARNING" not in upper

    for row in cutoffs_all + cutoffs_2025:
        if "branch_code" not in row:
            continue
        raw_code = str(row.get("college_code", row.get("tnea_code", ""))).strip()
        branch_code = str(row["branch_code"]).strip().upper()
        college_code = map_college_code(raw_code)
        branch_name = clean_text(row.get("branch_name")) or BRANCH_NAMES.get(branch_code)
        if college_code == "1452" and branch_code == "AM" and is_peri_ai_only(branch_name or ""):
            add_cb(
                college_code,
                branch_code,
                branch_name="Computer Science and Engineering (Artificial Intelligence)",
                extra=True,
            )
        else:
            add_cb(college_code, branch_code, branch_name=BRANCH_NAMES.get(branch_code))

    # College-branch rows are stored in one list. The second PERI AM programme
    # is kept as a separate row and resolved by name later.
    cb_rows = list(cb.values()) + list(cb_extra.values())
    cb_rows.sort(key=lambda row: (row["collegeCode"], row["branchCode"], row["branchName"]))
    for index, row in enumerate(cb_rows, start=1):
        row["id"] = index

    cb_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    cb_by_branch: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in cb_rows:
        cb_by_key[(row["collegeCode"], row["branchCode"], row["branchName"])] = row
        cb_by_branch[(row["collegeCode"], row["branchCode"])].append(row)

    def resolve_cb(raw_code: Any, branch_code: Any, branch_name: Any) -> dict[str, Any]:
        college_code = map_college_code(raw_code)
        code = str(branch_code).strip().upper()
        candidates = cb_by_branch.get((college_code, code), [])
        if not candidates:
            raise SystemExit(f"no college-branch for {college_code}/{code} ({branch_name})")
        if len(candidates) == 1:
            return candidates[0]
        # Only PERI's AM code has more than one programme.
        name = (branch_name or "").upper()
        for candidate in candidates:
            if is_peri_ai_only(name) and "ARTIFICIAL INTELLIGENCE" in candidate["branchName"].upper():
                return candidate
            if not is_peri_ai_only(name) and "AI AND MACHINE LEARNING" in candidate["branchName"].upper():
                return candidate
        return candidates[0]

    # ------------------------------------------------------------------ cutoffs
    cutoffs: dict[tuple[int, int, str], dict[str, Any]] = {}

    def add_cutoff(
        cb_record: dict[str, Any],
        year: int,
        community: str,
        mark: float | None,
        rank: int | None,
    ) -> None:
        key = (cb_record["id"], year, community)
        current = cutoffs.get(key)
        if current is None:
            cutoffs[key] = {
                "collegeBranchId": cb_record["id"],
                "year": year,
                "community": community,
                "cutoffMark": mark,
                "generalRank": rank,
            }
            return
        if mark is not None and (current["cutoffMark"] is None or mark > current["cutoffMark"]):
            current["cutoffMark"] = mark
        if rank is not None:
            current["generalRank"] = rank

    for row in cutoffs_all:
        if "category" not in row:
            continue
        year = int(row["year"])
        if year < 2020 or year > 2024:
            continue
        community = str(row["category"]).strip().upper()
        if community not in COMMUNITIES:
            continue
        mark = row.get("cutoff_mark")
        if mark is None:
            continue
        mark = float(mark)
        if mark < 0 or mark > 200:
            continue
        add_cutoff(resolve_cb(row["college_code"], row["branch_code"], row.get("branch_name")), year, community, mark, None)

    for row in cutoffs_2025:
        year = int(row.get("year", 2025))
        community = str(row["category"]).strip().upper()
        if community not in COMMUNITIES:
            continue
        mark = row.get("cutoff_mark")
        rank = row.get("general_rank")
        if mark is None and rank is None:
            continue
        if mark is not None:
            mark = float(mark)
            if mark < 0 or mark > 200:
                mark = None
        rank = int(rank) if rank is not None else None
        add_cutoff(resolve_cb(row["tnea_code"], row["branch_code"], row.get("branch_name")), year, community, mark, rank)

    # The per-year 2025 export used the second PERI AM programme's ranks for
    # both programmes. The archived college page distinguishes them, so patch
    # the first programme's ranks from its 2025 rank table.
    peri_html = (source / "raw_html/1452.html").read_text(encoding="utf-8", errors="ignore")
    html_text = re.sub(r"<script.*?</script>", " ", peri_html, flags=re.S | re.I)
    html_text = re.sub(r"<style.*?</style>", " ", html_text, flags=re.S | re.I)
    html_text = re.sub(r"<[^>]+>", " ", html_text)
    html_text = re.sub(r"\s+", " ", html_text)
    ranks_start = html_text.find("Ranks 2025")
    ranks_text = html_text[ranks_start:] if ranks_start >= 0 else ""
    peri_match = re.search(
        r"COMPUTER SCIENCE AND ENGINEERING \(AI AND MACHINE LEARNING\)\s+AM\s+"
        r"(\d+|-)\s+(\d+|-)\s+(\d+|-)\s+(\d+|-)\s+(\d+|-)\s+(\d+|-)\s+(\d+|-)",
        ranks_text,
    )
    if peri_match:
        peri_ai_ml = next(
            row for row in cb_by_branch[("1452", "AM")] if "AI AND MACHINE LEARNING" in row["branchName"].upper()
        )
        for community, value in zip(["OC", "BC", "MBC", "SC", "BCM", "SCA", "ST"], peri_match.groups()):
            key = (peri_ai_ml["id"], 2025, community)
            if key in cutoffs:
                cutoffs[key]["generalRank"] = None if value == "-" else int(value)

    # A patched PERI row can end up with neither a mark nor a rank. Such a row
    # carries no information, so it is not written.
    cutoffs_rows = sorted(
        (
            row
            for row in cutoffs.values()
            if row["cutoffMark"] is not None or row["generalRank"] is not None
        ),
        key=lambda row: (row["collegeBranchId"], row["year"], COMMUNITIES.index(row["community"])),
    )

    # -------------------------------------------------------------------- seats
    seats: dict[tuple[int, int], dict[str, Any]] = {}
    for row in cutoffs_all:
        if "total_seats" not in row:
            continue
        year = int(row["year"])
        cb_record = resolve_cb(row["college_code"], row["branch_code"], row.get("branch_name"))
        key = (cb_record["id"], year)
        total = int(row["total_seats"])
        current = seats.get(key)
        if current is None or total > current["totalSeats"]:
            seats[key] = {
                "collegeBranchId": cb_record["id"],
                "year": year,
                "totalSeats": total,
                "allotted": int(row["allotted"]) if row.get("allotted") is not None else None,
                "vacant": int(row["vacant"]) if row.get("vacant") is not None else None,
            }
    seats_rows = sorted(seats.values(), key=lambda row: (row["collegeBranchId"], row["year"]))

    # ------------------------------------------------------------------ hostels
    hostels: dict[str, dict[str, Any]] = {}
    for row in hostels_raw:
        code = map_generic_code(row["tnea_code"])
        if code not in colleges:
            continue
        hostels[code] = {
            "collegeCode": code,
            "boysAvailable": bool(row.get("boys")),
            "girlsAvailable": bool(row.get("girls")),
        }
    hostels_rows = sorted(hostels.values(), key=lambda row: row["collegeCode"])

    # --------------------------------------------------------------------- fees
    fees: dict[str, dict[str, Any]] = {}
    for row in fees_raw:
        code = map_generic_code(row["tnea_code"])
        if code not in colleges:
            continue

        def positive_int(value: Any) -> int | None:
            if value is None:
                return None
            number = int(float(value))
            return number if number > 0 else None

        transport_values = [positive_int(row.get("transport_min_fee")), positive_int(row.get("transport_max_fee"))]
        transport_values = [value for value in transport_values if value is not None]
        fees[code] = {
            "collegeCode": code,
            "year": int(row.get("year") or 2023),
            "tuitionFee": positive_int(row.get("tuition_fee")),
            "admissionFee": positive_int(row.get("admission_fee")),
            # This is the PDF's "Establishment Charges" (a hostel charge),
            # not tuition and not a total annual hostel cost.
            "establishmentFee": positive_int(row.get("establishment_fee")),
            "hostelFee": positive_int(row.get("hostel_fee")),
            "transportMinFee": min(transport_values) if transport_values else None,
            "transportMaxFee": max(transport_values) if transport_values else None,
        }
    fees_rows = sorted(fees.values(), key=lambda row: row["collegeCode"])

    # ------------------------------------------------------------------ output
    colleges_rows = sorted(colleges.values(), key=lambda row: row["code"])
    outputs: dict[str, list[dict[str, Any]]] = {
        "colleges": colleges_rows,
        "branches": branches,
        "college_branches": cb_rows,
        "cutoffs": cutoffs_rows,
        "seat_matrix": seats_rows,
        "hostels": hostels_rows,
        "fees": fees_rows,
    }
    for name, rows in outputs.items():
        write_ndjson(out / f"{name}.ndjson.gz", rows)

    # -------------------------------------------------------------- validations
    college_codes = {row["code"] for row in colleges_rows}
    branch_codes_used = {row["code"] for row in branches}
    cb_ids = {row["id"] for row in cb_rows}
    errors: list[str] = []

    for row in cb_rows:
        if row["collegeCode"] not in college_codes:
            errors.append(f"college_branches: bad college {row['collegeCode']}")
        if row["branchCode"] not in branch_codes_used:
            errors.append(f"college_branches: bad branch {row['branchCode']}")
    for row in cutoffs_rows:
        if row["collegeBranchId"] not in cb_ids:
            errors.append(f"cutoffs: bad college_branch {row['collegeBranchId']}")
    for row in seats_rows:
        if row["collegeBranchId"] not in cb_ids:
            errors.append(f"seat_matrix: bad college_branch {row['collegeBranchId']}")

    cutoff_keys = {(row["collegeBranchId"], row["year"], row["community"]) for row in cutoffs_rows}
    if len(cutoff_keys) != len(cutoffs_rows):
        errors.append("cutoffs: duplicate primary keys")
    seat_keys = {(row["collegeBranchId"], row["year"]) for row in seats_rows}
    if len(seat_keys) != len(seats_rows):
        errors.append("seat_matrix: duplicate primary keys")
    if any(row["generalRank"] is not None and row["year"] != 2025 for row in cutoffs_rows):
        errors.append("cutoffs: ranks must only exist for 2025")

    if errors:
        raise SystemExit("validation failed:\n" + "\n".join(errors[:20]))

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Original TNEA imports: 2023 college/branch/hostel/fee/facility exports, 2020-2025 cutoff export, 2025 rank export, and the Information_about_colleges PDF text.",
        "notes": [
            "Closing ranks are stored for 2025 only. The archived 2024 per-year file is an exact duplicate of 2025, so its ranks are not used.",
            "2020-2024 cutoff marks come from the all-years export after dropping rank-like values above 200 and keeping the highest mark per key.",
            "The 2025 PERI (1452) AI and Machine Learning ranks are patched from the archived college page; the source reused the Artificial Intelligence programme's ranks.",
            "Establishment fee is the reported hostel establishment charge, not tuition or a total annual hostel cost.",
            "Missing values are null and are rendered as 'Not reported'.",
        ],
        "counts": {
            "colleges": len(colleges_rows),
            "branches": len(branches),
            "collegeBranches": len(cb_rows),
            "cutoffs": len(cutoffs_rows),
            "seatMatrix": len(seats_rows),
            "hostels": len(hostels_rows),
            "fees": len(fees_rows),
        },
        "cutoffYears": dict(sorted(Counter(row["year"] for row in cutoffs_rows).items())),
        "collegeTypes": dict(sorted(Counter(row["type"] for row in colleges_rows).items())),
        "districts": len({row["district"] for row in colleges_rows if row["district"]}),
        "generalRanks": sum(1 for row in cutoffs_rows if row["generalRank"] is not None),
    }
    with (out / "manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print("Seed written to", out)
    for name, rows in outputs.items():
        print(f"  {name}: {len(rows)}")
    print("  cutoff years:", manifest["cutoffYears"])
    print("  college types:", manifest["collegeTypes"])
    print("  general ranks:", manifest["generalRanks"])


if __name__ == "__main__":
    main()

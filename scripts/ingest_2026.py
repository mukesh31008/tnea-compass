#!/usr/bin/env python3
"""Ingest the official TNEA 2026 documents into deterministic seed files.

The script never invents a value. It reads the published PDFs, verifies their
SHA-256 hashes, and writes only what the documents report. Every extracted
closing value carries the source document, PDF page and counselling round.

Usage:
    python3 scripts/ingest_2026.py --pdf-dir /path/to/pdfs
    python3 scripts/ingest_2026.py --pdf-dir /path/to/pdfs --download

The default output directory is data/seed. The generated files are gzipped
NDJSON with a fixed mtime so the same PDFs produce byte-identical output.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SEED_DIR = ROOT / "data" / "seed"
XHTML = "{http://www.w3.org/1999/xhtml}"

AUTHORITY = "Directorate of Technical Education, Tamil Nadu"
RETRIEVED_AT = "2026-11-07"

SOURCES = [
    {
        "id": "tnea-2026-allotment-r1",
        "file": "TNEA-2026-ROUND-1-GENERAL-ACADEMIC-PROVISIONAL-ALLOTMENT-LIST.pdf",
        "url": "https://static.tneaonline.org/docs/TNEA-2026-ROUND-1-GENERAL-ACADEMIC-PROVISIONAL-ALLOTMENT-LIST.pdf",
        "title": "TNEA 2026 General Academic Provisional Allotment List — Round 1",
        "sha256": "e76c1684bb27041441a0588f09f7540ef28b1c1423cdac9edaab57af086d49ba",
        "pageCount": 549,
        "documentType": "allotment",
        "round": 1,
    },
    {
        "id": "tnea-2026-allotment-r2",
        "file": "TNEA-2026-ROUND-2-GENERAL-ACADEMIC-PROVISIONAL-ALLOTMENT-LIST.pdf",
        "url": "https://static.tneaonline.org/docs/TNEA-2026-ROUND-2-GENERAL-ACADEMIC-PROVISIONAL-ALLOTMENT-LIST.pdf",
        "title": "TNEA 2026 General Academic Provisional Allotment List — Round 2",
        "sha256": "58f438d48e60718979a46b565cf4efd61aeff403029f7901b12efd7ba15b4466",
        "pageCount": 1136,
        "documentType": "allotment",
        "round": 2,
    },
    {
        "id": "tnea-2026-allotment-r3",
        "file": "TNEA-2026-ROUND-3-GENERAL-ACADEMIC-PROVISIONAL-ALLOTMENT-LIST.pdf",
        "url": "https://static.tneaonline.org/docs/TNEA-2026-ROUND-3-GENERAL-ACADEMIC-PROVISIONAL-ALLOTMENT-LIST.pdf",
        "title": "TNEA 2026 General Academic Provisional Allotment List — Round 3",
        "sha256": "2d2626320c682dfdcb48eef7cc59797ef8c69a9d1aff9e3108cf5155f03f7d26",
        "pageCount": 1176,
        "documentType": "allotment",
        "round": 3,
    },
    {
        "id": "tnea-2026-seat-matrix",
        "file": "GENERAL_ACADEMIC_SEAT_MATRIX_BEFORE_SPECIAL_RESERVATION_COUNSELLING_2026.pdf",
        "url": "https://static.tneaonline.org/docs/GENERAL_ACADEMIC_SEAT_MATRIX_BEFORE_SPECIAL_RESERVATION_COUNSELLING_2026.pdf",
        "title": "TNEA 2026 General Academic Seat Matrix before Special Reservation Counselling",
        "sha256": "85dbb154b56822fef150054e4508787d53b9f438fdf5a5532da7b3d02e547743",
        "pageCount": 319,
        "documentType": "seat_matrix",
        "round": None,
    },
    {
        "id": "tnea-2026-vacancy-r3",
        "file": "TNEA-2026-GENERAL-ACADEMIC-VACANCY-POSITION-AFTER-ROUND-3.pdf",
        "url": "https://static.tneaonline.org/docs/TNEA-2026-GENERAL-ACADEMIC-VACANCY-POSITION-AFTER-ROUND-3.pdf",
        "title": "TNEA 2026 General Academic Vacancy Position after Round 3",
        "sha256": "db55d81d6089edd1f470c3070e4ea8858d07e42de57c8df3534cef6bf61bef0e",
        "pageCount": 283,
        "documentType": "vacancy",
        "round": 3,
    },
    {
        "id": "tnea-2026-college-directory",
        "file": "Information_about_colleges_2026.pdf",
        "url": "https://static.tneaonline.org/docs/Information_about_colleges_2026.pdf",
        "title": "Information about Colleges 2026",
        "sha256": "035dd2604fa784c0ce57379783b50eca1a0972a08a6e7811ab2ca50562ce5373",
        "pageCount": 460,
        "documentType": "college_directory",
        "round": None,
    },
]

# The 12 branch codes that first appear in the 2026 documents. Names are the
# official names printed in the seat matrix; obvious source typos are corrected
# only where the same programme name is used elsewhere in the same document.
NEW_BRANCHES = {
    "CQ": "Communication and Industrial Design",
    "CU": "Computer Science and Engineering and Business Systems",
    "CV": "Computer Science and Engineering (AR/VR and Media Design)",
    "DS": "Data Sciences",
    "DV": "Data Visualization and Data Science",
    "EG": "Electronics and Communication Engineering (Advanced Communication Technology)",
    "ER": "Environmental Science and Technology",
    "EU": "Electrical and Computer Engineering (SS)",
    "GL": "Generative AI and Machine Learning",
    "IF": "Interior Design",
    "RI": "Robotics and Artificial Intelligence",
    "VL": "Electronics and Communication Engineering (VLSI Design and Technology)",
}

# Districts are read from the official college address in the 2026 directory.
# They use the same spellings as the existing district master.
NEW_COLLEGE_DISTRICTS = {
    "1102": "Tiruvallur",
    "1111": "Chennai",
    "1115": "Tiruvallur",
    "1203": "Kanchipuram",
    "1221": "Chennai",
    "1232": "Chengalpattu",
    "1235": "Kanchipuram",
    "1333": "Kanchipuram",
    "1339": "Chennai",
    "2323": "Tiruppur",
    "2347": "Salem",
    "2368": "Coimbatore",
    "2378": "Tiruppur",
    "2618": "Salem",
    "2659": "Salem",
    "2777": "Erode",
    "3018": "Nagapattinam",
    "3477": "Tiruchirappalli",
    "3555": "Cuddalore",
    "3838": "Thanjavur",
    "3848": "Thanjavur",
    "4747": "Tenkasi",
    "4911": "Kanniyakumari",
    "4925": "Kanniyakumari",
    "4943": "Kanniyakumari",
    "4986": "Kanniyakumari",
    "5545": "Dindigul",
    "5546": "Dindigul",
}

# 3018 is in the official "Constituent Colleges" section. The existing dataset
# uses "Government Aided" for the other University College of Engineering rows,
# so the same label is used here. Every other new college is Self-Financing.
NEW_COLLEGE_TYPES = {code: "Self-Financing" for code in NEW_COLLEGE_DISTRICTS}
NEW_COLLEGE_TYPES["3018"] = "Government Aided"

# The 2026 directory does not include Mass Engineering College (3838), but the
# official vacancy statement does. The name is copied from that document.
MANUAL_COLLEGE_NAMES = {
    "3838": "MASS ENGINEERING COLLEGE, CHENNAI SALAI, KALLAPULIYUR VILLAGE, KUMBAKONAM, THANJAVUR - 612 501.",
    "3838_source": "tnea-2026-vacancy-r3",
}

ALLOTMENT_ROW = re.compile(
    r"^\s*(\d+)\s+(\d{6})\s+(OC|BC|BCM|MBC|SC|SCA|ST)\s+"
    r"(\d{1,3}\.\d{3})\s+(\d+)([A-Z]?)\s+(\d{1,4})\s+([A-Z]{2})\s+"
    r"(OC|BC|BCM|MBC|SC|SCA|ST)\s*$"
)

# Seat matrix columns, left to right: OC BC BCM MBC SC SCA ST TOTAL.
SEAT_COLUMNS = ["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"]
# Vacancy columns, left to right: OC BCM BC MBC SCA SC ST.
VACANCY_COLUMNS = ["OC", "BCM", "BC", "MBC", "SCA", "SC", "ST"]


def fail(message: str) -> None:
    raise SystemExit(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def ensure_sources(pdf_dir: Path, download: bool) -> None:
    pdf_dir.mkdir(parents=True, exist_ok=True)
    for source in SOURCES:
        path = pdf_dir / source["file"]
        if not path.exists():
            if not download:
                fail(
                    f"missing {path}. Re-run with --download to fetch the official PDF."
                )
            print(f"Downloading {source['url']}")
            urllib.request.urlretrieve(source["url"], path)
        actual = sha256(path)
        if actual != source["sha256"]:
            fail(
                f"hash mismatch for {path.name}: expected {source['sha256']}, got {actual}"
            )
        print(f"verified {path.name} ({actual[:12]}…)")


def pdftotext(path: Path, bbox: bool) -> str:
    args = ["pdftotext"]
    if bbox:
        args.append("-bbox-layout")
    else:
        args.append("-layout")
    args.extend([str(path), "-"])
    try:
        return subprocess.check_output(args).decode("utf-8", errors="replace")
    except FileNotFoundError:
        fail("pdftotext is required (install poppler-utils)")
    except subprocess.CalledProcessError as error:
        fail(f"pdftotext failed for {path}: {error}")


def parse_allotments(pdf_dir: Path) -> dict[int, list[dict]]:
    rounds: dict[int, list[dict]] = {}
    for source in SOURCES:
        if source["documentType"] != "allotment":
            continue
        text = pdftotext(pdf_dir / source["file"], bbox=False)
        rows: list[dict] = []
        for page_number, page in enumerate(text.split("\f"), 1):
            for line in page.splitlines():
                match = ALLOTMENT_ROW.match(line)
                if not match:
                    continue
                (
                    serial,
                    application,
                    community,
                    mark,
                    rank,
                    suffix,
                    college,
                    branch,
                    allotted,
                ) = match.groups()
                rows.append(
                    {
                        "serial": int(serial),
                        "application": application,
                        "community": community,
                        "mark": float(mark),
                        "rank": int(rank),
                        "suffix": suffix,
                        "college": college.zfill(4),
                        "branch": branch,
                        "allotted": allotted,
                        "page": page_number,
                    }
                )
        if not rows:
            fail(f"no allotment rows parsed from {source['file']}")
        rounds[source["round"]] = rows
    return rounds


def assert_allotment_integrity(rounds: dict[int, list[dict]]) -> None:
    expected = {1: 24674, 2: 49984, 3: 52915}
    seen: set[str] = set()
    for round_number in (1, 2, 3):
        rows = rounds.get(round_number, [])
        if len(rows) != expected[round_number]:
            fail(
                f"round {round_number}: expected {expected[round_number]} rows, got {len(rows)}"
            )
        local: set[str] = set()
        for row in rows:
            if row["application"] in local:
                fail(f"duplicate application {row['application']} in round {round_number}")
            local.add(row["application"])
        overlap = seen & local
        if overlap:
            fail(f"{len(overlap)} applications repeat across rounds")
        seen |= local
        print(f"round {round_number}: {len(rows)} allotments, {len(local)} candidates")


def close_group(rows: list[dict]) -> dict:
    """The last-ranked allotment in a group, using rank then tie-break suffix."""
    last = max(rows, key=lambda row: (row["rank"], row["suffix"]))
    return {
        "mark": last["mark"],
        "rank": last["rank"],
        "suffix": last["suffix"],
        "page": last["page"],
        "round": last["round"],
        "candidates": len(rows),
        "college": last["college"],
        "branch": last["branch"],
        "community": last["allotted"],
    }


def closes_by_allotted_community(rows: list[dict]) -> dict[tuple[str, str, str], dict]:
    groups: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for row in rows:
        groups[(row["college"], row["branch"], row["allotted"])].append(row)
    return {key: close_group(value) for key, value in groups.items()}


def build_round_data(rounds: dict[int, list[dict]]) -> tuple[list[dict], list[dict]]:
    cumulative: list[dict] = []
    timeline: list[dict] = []
    final: dict[tuple[str, str, str], dict] = {}
    for round_number in (1, 2, 3):
        cumulative.extend(
            {**row, "round": round_number} for row in rounds[round_number]
        )
        final = closes_by_allotted_community(cumulative)
        print(
            f"after round {round_number}: {len(final)} programme/community groups"
        )
        for (college, branch, community), close in final.items():
            timeline.append(
                {
                    "college": college,
                    "branch": branch,
                    "community": community,
                    "round": round_number,
                    "mark": close["mark"],
                    "rank": close["rank"],
                    "suffix": close["suffix"],
                    "page": close["page"],
                    "sourceRound": close["round"],
                    "candidates": close["candidates"],
                }
            )
    final_rows = []
    for (college, branch, community), close in sorted(final.items()):
        final_rows.append(
            {
                "college": college,
                "branch": branch,
                "community": community,
                "mark": close["mark"],
                "rank": close["rank"],
                "suffix": close["suffix"],
                "page": close["page"],
                "round": close["round"],
                "candidates": close["candidates"],
            }
        )
    return final_rows, timeline


def words_from_bbox(pdf_path: Path) -> list[list[tuple[float, float, str]]]:
    text = pdftotext(pdf_path, bbox=True)
    try:
        root = ET.fromstring(text)
    except ET.ParseError as error:
        fail(f"could not parse bbox output for {pdf_path}: {error}")
    pages: list[list[tuple[float, float, str]]] = []
    for page in root.iter(f"{XHTML}page"):
        words = [
            (float(word.get("xMin")), float(word.get("yMin")), word.text or "")
            for word in page.iter(f"{XHTML}word")
        ]
        pages.append(words)
    return pages


def parse_numeric_table(
    pages: list[list[tuple[float, float, str]]],
    *,
    columns: list[str],
    x_min: float,
) -> list[dict]:
    """Parse a community-column table by aligning words on the same baseline.

    The branch code is a two-letter word in the branch-code column. Numbers to
    the right of `x_min` are sorted left to right and assigned to the printed
    header order. This avoids relying on wrapped branch-name text.
    """
    rows: list[dict] = []
    for page_number, words in enumerate(pages, 1):
        numbers: dict[int, list[tuple[float, int]]] = defaultdict(list)
        for x, y, text in words:
            if x >= x_min and re.fullmatch(r"\d+", text):
                numbers[round(y)].append((x, int(text)))
        college_codes = [
            (x, y, text)
            for x, y, text in words
            if 30 <= x <= 85 and re.fullmatch(r"\d{1,4}", text)
        ]
        branch_codes = [
            (x, y, text)
            for x, y, text in words
            if 335 <= x <= 388 and re.fullmatch(r"[A-Z]{2}", text)
        ]
        for y, values in numbers.items():
            if len(values) != len(columns):
                continue
            values.sort()
            if values[-1][0] - values[0][0] < 100:
                continue
            colleges = [row for row in college_codes if abs(row[1] - y) <= 1.5]
            branches = [row for row in branch_codes if abs(row[1] - y) <= 1.5]
            if len(colleges) != 1 or len(branches) != 1:
                fail(
                    f"page {page_number}: expected one college and branch code on row {y}, "
                    f"got {len(colleges)} and {len(branches)}"
                )
            rows.append(
                {
                    "college": colleges[0][2].zfill(4),
                    "branch": branches[0][2],
                    "values": {column: value for column, (_, value) in zip(columns, values)},
                    "page": page_number,
                }
            )
    return rows


def parse_seat_matrix(pdf_dir: Path) -> list[dict]:
    source = next(
        item for item in SOURCES if item["documentType"] == "seat_matrix"
    )
    rows = parse_numeric_table(
        words_from_bbox(pdf_dir / source["file"]),
        columns=SEAT_COLUMNS + ["TOTAL"],
        x_min=530,
    )
    for row in rows:
        values = row["values"]
        if values["TOTAL"] != sum(values[column] for column in SEAT_COLUMNS):
            fail(f"seat total does not add up for {row['college']}/{row['branch']}")
    if len(rows) != 3354:
        fail(f"expected 3354 seat rows, got {len(rows)}")
    if len({(row["college"], row["branch"]) for row in rows}) != len(rows):
        fail("duplicate seat matrix keys")
    print(
        f"seat matrix: {len(rows)} rows, "
        f"{len({row['college'] for row in rows})} colleges, "
        f"{sum(row['values']['TOTAL'] for row in rows)} seats"
    )
    return rows


def parse_vacancies(pdf_dir: Path) -> list[dict]:
    source = next(item for item in SOURCES if item["documentType"] == "vacancy")
    rows = parse_numeric_table(
        words_from_bbox(pdf_dir / source["file"]),
        columns=VACANCY_COLUMNS,
        x_min=580,
    )
    if len(rows) != 3468:
        fail(f"expected 3468 vacancy rows, got {len(rows)}")
    if len({(row["college"], row["branch"]) for row in rows}) != len(rows):
        fail("duplicate vacancy keys")
    total = sum(sum(row["values"].values()) for row in rows)
    print(
        f"vacancies: {len(rows)} rows, "
        f"{len({row['college'] for row in rows})} colleges, {total} vacancies"
    )
    return rows


def parse_college_names(pdf_dir: Path) -> dict[str, str]:
    """Read the alphabetical college list, where codes sit at x ≈ 95."""
    source = next(
        item for item in SOURCES if item["documentType"] == "college_directory"
    )
    pages = words_from_bbox(pdf_dir / source["file"])
    names: dict[str, str] = {}
    for page in pages:
        header = any(abs(x - 92.8) < 1.2 and text == "TNEA" for x, _, text in page)
        if not header:
            continue
        codes = sorted(
            (y, text)
            for x, y, text in page
            if abs(x - 95.0) < 1.0 and re.fullmatch(r"\d{1,4}", text)
        )
        for index, (y, code) in enumerate(codes):
            end = codes[index + 1][0] if index + 1 < len(codes) else y + 60
            name_words = [
                (x, yy, text)
                for x, yy, text in page
                if 138 <= x < 518 and y - 1 <= yy < end - 0.5
            ]
            name_words.sort(key=lambda item: (item[1], item[0]))
            name = re.sub(r"\s+", " ", " ".join(text for _, _, text in name_words)).strip()
            if name:
                names[code.zfill(4)] = name
    print(f"college directory: {len(names)} names parsed")
    return names


def read_ndjson_gz(path: Path) -> list[dict]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_ndjson_gz(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as raw:
        with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as handle:
            for row in rows:
                handle.write(
                    (
                        json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n"
                    ).encode("utf-8")
                )


def build_college_branch_map(
    seed_dir: Path,
    pairs: set[tuple[str, str]],
    branch_names: dict[str, str],
) -> tuple[dict[tuple[str, str], int], list[dict]]:
    base = read_ndjson_gz(seed_dir / "college_branches.ndjson.gz")
    by_pair: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in base:
        by_pair[(row["collegeCode"], row["branchCode"])].append(row)
    max_id = max(row["id"] for row in base)

    mapping: dict[tuple[str, str], int] = {}
    additions: list[dict] = []
    for college, branch in sorted(pairs):
        existing = by_pair.get((college, branch), [])
        if existing:
            if len(existing) == 1:
                mapping[(college, branch)] = existing[0]["id"]
            elif college == "1452" and branch == "AM":
                # 2026 has one AM programme: AI and Machine Learning. The base
                # has a second AM row from an older source and must not receive
                # the 2026 values.
                preferred = next(
                    (
                        row
                        for row in existing
                        if "machine learning" in row["branchName"].lower()
                    ),
                    existing[0],
                )
                mapping[(college, branch)] = preferred["id"]
            else:
                mapping[(college, branch)] = existing[0]["id"]
            continue
        max_id += 1
        mapping[(college, branch)] = max_id
        additions.append(
            {
                "id": max_id,
                "collegeCode": college,
                "branchCode": branch,
                "branchName": branch_names[branch],
                "approvedIntake": None,
                "yearStarted": None,
                "nba": None,
                "nbaValidUpTo": None,
            }
        )
    print(f"college branches: {len(additions)} new rows, {len(mapping)} mapped pairs")
    return mapping, additions


def build_seed(pdf_dir: Path, seed_dir: Path) -> None:
    base_manifest = json.loads((seed_dir / "manifest.json").read_text(encoding="utf-8"))

    # Base counts are recomputed from the base seed files on every run so that
    # re-running the ingest cannot accumulate the 2026 additions twice.
    base_college_rows = read_ndjson_gz(seed_dir / "colleges.ndjson.gz")
    base_branch_rows = read_ndjson_gz(seed_dir / "branches.ndjson.gz")
    base_college_branch_rows = read_ndjson_gz(seed_dir / "college_branches.ndjson.gz")
    base_cutoff_rows = read_ndjson_gz(seed_dir / "cutoffs.ndjson.gz")
    base_seat_rows = read_ndjson_gz(seed_dir / "seat_matrix.ndjson.gz")
    base_hostel_rows = read_ndjson_gz(seed_dir / "hostels.ndjson.gz")
    base_fee_rows = read_ndjson_gz(seed_dir / "fees.ndjson.gz")
    base_counts = {
        "colleges": len(base_college_rows),
        "branches": len(base_branch_rows),
        "collegeBranches": len(base_college_branch_rows),
        "cutoffs": len(base_cutoff_rows),
        "seatMatrix": len(base_seat_rows),
        "hostels": len(base_hostel_rows),
        "fees": len(base_fee_rows),
    }
    base_branches = {row["code"]: row["name"] for row in base_branch_rows}
    branch_names = {**base_branches, **NEW_BRANCHES}

    rounds = parse_allotments(pdf_dir)
    assert_allotment_integrity(rounds)
    final_rows, timeline = build_round_data(rounds)
    seat_rows = parse_seat_matrix(pdf_dir)
    vacancy_rows = parse_vacancies(pdf_dir)
    directory_names = parse_college_names(pdf_dir)

    pairs = {(row["college"], row["branch"]) for row in seat_rows}
    pairs |= {(row["college"], row["branch"]) for row in vacancy_rows}
    for row in final_rows:
        pairs.add((row["college"], row["branch"]))

    missing_branches = sorted({branch for _, branch in pairs} - set(branch_names))
    if missing_branches:
        fail(f"missing branch names: {missing_branches}")

    base_college_codes = {
        row["code"] for row in read_ndjson_gz(seed_dir / "colleges.ndjson.gz")
    }
    new_college_codes = sorted(
        {college for college, _ in pairs} - base_college_codes
    )
    if new_college_codes != sorted(NEW_COLLEGE_DISTRICTS):
        fail(
            "new college list changed: "
            f"expected {sorted(NEW_COLLEGE_DISTRICTS)}, got {new_college_codes}"
        )
    missing_colleges = sorted(
        code
        for code in new_college_codes
        if code not in directory_names and code not in MANUAL_COLLEGE_NAMES
    )
    if missing_colleges:
        fail(f"missing official college names: {missing_colleges}")

    mapping, college_branch_additions = build_college_branch_map(
        seed_dir, pairs, branch_names
    )

    college_rows = []
    for code in new_college_codes:
        name = (
            MANUAL_COLLEGE_NAMES[code]
            if code in MANUAL_COLLEGE_NAMES
            else directory_names[code]
        )
        source_id = MANUAL_COLLEGE_NAMES.get(f"{code}_source", "tnea-2026-college-directory")
        college_rows.append(
            {
                "code": code,
                "name": name,
                "shortName": None,
                "district": NEW_COLLEGE_DISTRICTS[code],
                "type": NEW_COLLEGE_TYPES[code],
                "autonomous": True if "autonomous" in name.lower() else None,
                "minority": None,
                "address": None,
                "taluk": None,
                "pincode": None,
                "phone": None,
                "email": None,
                "website": None,
                "establishedYear": None,
                "transportAvailable": None,
                "sourceDocumentId": source_id,
            }
        )

    branch_rows = [
        {
            "code": code,
            "name": name,
            "sourceDocumentId": "tnea-2026-seat-matrix",
        }
        for code, name in sorted(NEW_BRANCHES.items())
    ]

    cutoff_rows = []
    for row in final_rows:
        cutoff_rows.append(
            {
                "collegeBranchId": mapping[(row["college"], row["branch"])],
                "year": 2026,
                "community": row["community"],
                "cutoffMark": row["mark"],
                "generalRank": row["rank"],
                "rankSuffix": row["suffix"] or None,
                "candidateCount": row["candidates"],
                "method": "last-ranked allotment across R1–R3 by allotted community",
                "sourceDocumentId": f"tnea-2026-allotment-r{row['round']}",
                "sourcePage": row["page"],
                "sourceRound": row["round"],
            }
        )
    cutoff_rows.sort(key=lambda row: (row["collegeBranchId"], row["community"]))

    round_rows = []
    for row in timeline:
        round_rows.append(
            {
                "collegeBranchId": mapping[(row["college"], row["branch"])],
                "year": 2026,
                "community": row["community"],
                "round": row["round"],
                "cutoffMark": row["mark"],
                "generalRank": row["rank"],
                "rankSuffix": row["suffix"] or None,
                "candidateCount": row["candidates"],
                "sourceDocumentId": f"tnea-2026-allotment-r{row['sourceRound']}",
                "sourcePage": row["page"],
                "sourceRound": row["sourceRound"],
            }
        )
    round_rows.sort(
        key=lambda row: (
            row["collegeBranchId"],
            row["community"],
            row["round"],
        )
    )

    seat_seed = []
    for row in seat_rows:
        seat_seed.append(
            {
                "collegeBranchId": mapping[(row["college"], row["branch"])],
                "year": 2026,
                "totalSeats": row["values"]["TOTAL"],
                "allotted": None,
                "vacant": None,
                "sourceDocumentId": "tnea-2026-seat-matrix",
                "sourcePage": row["page"],
            }
        )
    seat_seed.sort(key=lambda row: row["collegeBranchId"])

    vacancy_seed = []
    for row in vacancy_rows:
        for community in VACANCY_COLUMNS:
            vacancy_seed.append(
                {
                    "collegeBranchId": mapping[(row["college"], row["branch"])],
                    "year": 2026,
                    "community": community,
                    "vacantSeats": row["values"][community],
                    "sourceDocumentId": "tnea-2026-vacancy-r3",
                    "sourcePage": row["page"],
                }
            )
    vacancy_seed.sort(
        key=lambda row: (row["collegeBranchId"], row["community"])
    )

    source_rows = []
    for source in SOURCES:
        source_rows.append(
            {
                "id": source["id"],
                "authority": AUTHORITY,
                "title": source["title"],
                "url": source["url"],
                "retrievedAt": RETRIEVED_AT,
                "publishedAt": None,
                "sha256": source["sha256"],
                "pageCount": source["pageCount"],
                "documentType": source["documentType"],
                "year": 2026,
                "round": source["round"],
                "status": "verified",
                "notes": (
                    "SHA-256 of the official PDF that was parsed. "
                    "Page numbers are PDF pages, not printed page numbers."
                ),
            }
        )

    write_ndjson_gz(seed_dir / "source_documents.ndjson.gz", source_rows)
    write_ndjson_gz(seed_dir / "colleges_2026.ndjson.gz", college_rows)
    write_ndjson_gz(seed_dir / "branches_2026.ndjson.gz", branch_rows)
    write_ndjson_gz(
        seed_dir / "college_branches_2026.ndjson.gz", college_branch_additions
    )
    write_ndjson_gz(seed_dir / "cutoffs_2026.ndjson.gz", cutoff_rows)
    write_ndjson_gz(seed_dir / "round_cutoffs.ndjson.gz", round_rows)
    write_ndjson_gz(seed_dir / "seat_matrix_2026.ndjson.gz", seat_seed)
    write_ndjson_gz(seed_dir / "vacancies_2026.ndjson.gz", vacancy_seed)

    counts = dict(base_counts)
    counts["colleges"] += len(college_rows)
    counts["branches"] += len(branch_rows)
    counts["collegeBranches"] += len(college_branch_additions)
    counts["cutoffs"] += len(cutoff_rows)
    counts["seatMatrix"] += len(seat_seed)
    counts["roundCutoffs"] = len(round_rows)
    counts["vacancies"] = len(vacancy_seed)
    counts["sourceDocuments"] = len(source_rows)

    cutoff_years: dict[int, int] = {}
    for row in base_cutoff_rows:
        year = int(row["year"])
        cutoff_years[year] = cutoff_years.get(year, 0) + 1
    cutoff_years[2026] = len(cutoff_rows)

    college_types: dict[str, int] = {}
    for row in base_college_rows:
        college_types[row["type"]] = college_types.get(row["type"], 0) + 1
    for row in college_rows:
        college_types[row["type"]] = college_types.get(row["type"], 0) + 1

    manifest = {
        "generatedAt": RETRIEVED_AT,
        "source": (
            "Original TNEA imports for 2020–2025, plus the official TNEA 2026 "
            "allotment lists, seat matrix, post-Round-3 vacancy statement and "
            "college directory published at static.tneaonline.org."
        ),
        "notes": [
            "2026 closing values are the last-ranked allotment in the union of Rounds 1–3, grouped by the community against which the seat was allotted.",
            "2026 closing ranks are stored with the round and PDF page of the last-ranked allotment; the R3 cumulative close is the Round 3 cumulative close.",
            "Round cutoff rows are cumulative: round 2 includes round 1, and round 3 includes rounds 1 and 2.",
            "2026 seat totals come from the official seat matrix; allotted seats are left null because the matrix does not report them.",
            "2026 vacancies are the official post-Round-3 vacancy statement, split by community.",
            "Closing ranks are stored for 2025 and 2026 only. The archived 2024 per-year rank export is an exact duplicate of 2025, so its ranks are not used.",
            "2020–2024 cutoff marks come from the all-years export after dropping rank-like values above 200 and keeping the highest mark per key.",
            "The 2025 PERI (1452) AI and Machine Learning ranks are patched from the archived college page; the source reused the Artificial Intelligence programme's ranks.",
            "Establishment fee is the reported hostel establishment charge, not tuition or a total annual hostel cost.",
            "Missing values are null and are rendered as 'Not reported'.",
        ],
        "counts": counts,
        "cutoffYears": {str(year): cutoff_years[year] for year in sorted(cutoff_years)},
        "collegeTypes": dict(sorted(college_types.items())),
        "districts": base_manifest["districts"],
        "generalRanks": sum(
            1 for row in base_cutoff_rows if row["generalRank"] is not None
        )
        + sum(1 for row in cutoff_rows if row["generalRank"] is not None),
    }
    (seed_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print("wrote seed files")
    print(json.dumps(counts, indent=2))
    print(
        f"final 2026 closes: {len(cutoff_rows)}; "
        f"round rows: {len(round_rows)}; "
        f"vacancy rows: {len(vacancy_seed)}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=ROOT / "data" / "sources" / "2026",
        help="directory containing the official PDFs",
    )
    parser.add_argument(
        "--seed-dir",
        type=Path,
        default=DEFAULT_SEED_DIR,
        help="directory containing the base seed files",
    )
    parser.add_argument(
        "--download",
        action="store_true",
        help="download missing PDFs from static.tneaonline.org",
    )
    args = parser.parse_args()
    ensure_sources(args.pdf_dir, args.download)
    build_seed(args.pdf_dir, args.seed_dir)


if __name__ == "__main__":
    main()

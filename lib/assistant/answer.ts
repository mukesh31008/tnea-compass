import "server-only";

import type { AssistantCitation, AssistantResult, AssistantTable } from "@/lib/assistant/types";
import {
  getCutoffRows,
  getDocumentsForIds,
  getProgrammeSeatsAndVacancies,
  getSeatRows,
  getSources,
  getTimelineRows,
  getVacancyLeaderboard,
} from "@/lib/assistant/data";
import { unsupportedReason } from "@/lib/assistant/guards";
import { parseQuestion, type ParsedQuery } from "@/lib/assistant/parse";
import { getCollegeProfile, getDatasetStats } from "@/lib/db/queries";
import { COMMUNITIES } from "@/lib/tnea";
import { formatInr, formatNumber } from "@/lib/utils";

const MAX_TABLE_ROWS = 30;

function shortName(name: string, short: string | null) {
  return short ?? name;
}

function mark(value: number | null | undefined) {
  return value === null || value === undefined ? "Not reported" : value.toFixed(1);
}

function rank(value: number | null | undefined, suffix: string | null) {
  if (value === null || value === undefined) return "Not reported";
  return `#${formatNumber(value)}${suffix ?? ""}`;
}

function sourceLabel(row: {
  year: number;
  sourceRound: number | null;
  sourcePage: number | null;
}) {
  const parts = [String(row.year)];
  if (row.sourceRound) parts.push(`R${row.sourceRound}`);
  if (row.sourcePage) parts.push(`p${row.sourcePage}`);
  return parts.join(" · ");
}

function citationsForRows(
  rows: {
    year: number;
    sourceRound: number | null;
    sourcePage: number | null;
    sourceDocumentId: string | null;
  }[],
  documents: Awaited<ReturnType<typeof getDocumentsForIds>>,
): AssistantCitation[] {
  const seen = new Map<string, AssistantCitation>();

  for (const row of rows) {
    const document = row.sourceDocumentId
      ? documents.get(row.sourceDocumentId)
      : null;
    if (!document) {
      seen.set("archive", {
        label: "Archived TNEA cutoff export",
        detail: "See the data provenance ledger for the archived source.",
        href: "/about#data",
      });
      continue;
    }
    const key = `${document.id}:${row.sourceRound ?? ""}:${row.sourcePage ?? ""}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      label: `${sourceLabel(row)} · ${document.title}`,
      detail: `${document.authority} · SHA-256 ${document.sha256.slice(0, 16)}…`,
      href: document.url,
    });
  }

  return [...seen.values()].slice(0, 10);
}

function documentCitations(
  documents: Awaited<ReturnType<typeof getSources>>,
  pattern: RegExp,
): AssistantCitation[] {
  return documents
    .filter((document) => pattern.test(document.title))
    .map((document) => ({
      label: `${document.year}${document.round ? ` R${document.round}` : ""} · ${document.title}`,
      detail: `${document.authority} · ${document.pageCount} pages`,
      href: document.url,
    }));
}

function baseResult(parsed: ParsedQuery): Pick<
  AssistantResult,
  "kind" | "tables" | "citations" | "caveats" | "followUps" | "usedModel"
> {
  return {
    kind: "answer",
    tables: [],
    citations: [],
    caveats: [],
    followUps: [],
    usedModel: parsed.usedModel,
  };
}

function refusal(reason: string, usedModel: boolean): AssistantResult {
  return {
    kind: "refusal",
    title: "That is outside the record",
    summary: `${reason} Ask for a published closing mark, rank, round timeline, seat count, vacancy count or source document instead.`,
    tables: [],
    citations: [
      { label: "Method and data provenance", href: "/about#method" },
    ],
    caveats: [
      "The assistant reads public TNEA records only. It cannot see your profile, marks, exams, applications or choice list.",
    ],
    followUps: [
      "What was the 2026 OC close for CEG Computer Science?",
      "Show the 2026 R1–R3 timeline for 0001 CS for BC.",
      "Which colleges had the most vacancies in ECE after Round 3?",
    ],
    usedModel,
  };
}

function clarify(question: string, parsed: ParsedQuery): AssistantResult {
  return {
    ...baseResult(parsed),
    kind: "clarify",
    title: "Tell me which record to read",
    summary:
      "I can answer questions about published TNEA closes, round timelines, seats, vacancies and source documents. Add a four-digit college code or a distinctive college name, and a branch or community if you have one.",
    caveats: [
      "No value is estimated. If the record is missing, the answer says Not reported.",
      `Your question was: “${question}”`,
    ],
    followUps: [
      "What was the 2026 OC close for 0001 CS?",
      "Compare 0001 and 2006 for Computer Science in 2026.",
      "Show 2026 vacancies after Round 3 for ECE.",
      "Where did the 2026 CEG cutoff come from?",
    ],
  };
}

function closeSummary(
  parsed: ParsedQuery,
  rows: Awaited<ReturnType<typeof getCutoffRows>>,
): string {
  const first = rows[0];
  if (!first) {
    return `No ${parsed.year} closing row is reported for that college, branch and community in this dataset.`;
  }

  const place = `${shortName(first.collegeName, first.collegeShortName)}${parsed.branch ? `, ${first.branchName}` : ""}`;
  const community = parsed.community ?? "the selected community";

  const rankText =
    first.rank === null || first.rank === undefined
      ? ""
      : `, at ${rank(first.rank, first.rankSuffix)}`;

  if (parsed.community) {
    return `${place} closed at ${mark(first.mark)} for ${community} in ${parsed.year}${rankText}.${
      parsed.year === 2026
        ? ` The last-ranked candidate was allotted in Round ${first.sourceRound ?? "not reported"} (PDF page ${first.sourcePage ?? "not reported"}).`
        : ""
    }`;
  }

  return `Here are the published ${parsed.year} closes for ${place}. ${rows.length} community row${rows.length === 1 ? "" : "s"} are available in the record.`;
}

async function answerCloses(parsed: ParsedQuery): Promise<AssistantResult> {
  if (!parsed.college) return clarify("", parsed);
  if (parsed.year === 2026 && !parsed.community && !parsed.branch) {
    // Keep a whole-college table readable by defaulting the narrative to OC.
    parsed.community = "OC";
  }

  const rows = await getCutoffRows({
    collegeCode: parsed.college.code,
    branchCode: parsed.branch?.code,
    year: parsed.year,
    community: parsed.community,
  });
  const documents = await getDocumentsForIds(rows.map((row) => row.sourceDocumentId));

  if (rows.length === 0) {
    return {
      ...baseResult(parsed),
      title: `${shortName(parsed.college.name, parsed.college.shortName)} · ${parsed.year}`,
      summary: `No ${parsed.year} closing row is reported for ${
        parsed.branch?.name ?? "that branch"
      }${parsed.community ? ` for ${parsed.community}` : ""} in this dataset. That is a missing record, not a zero.`,
      caveats: ["The dataset only contains rows published in the official TNEA documents."],
      followUps: [
        `Show all ${parsed.year} closes for ${parsed.college.code}.`,
        `Show the 2026 seat matrix for ${parsed.college.code}.`,
      ],
      citations: [{ label: "Data provenance", href: "/about#data" }],
    };
  }

  const table: AssistantTable = {
    title: `${sourceLabel({ year: parsed.year, sourceRound: null, sourcePage: null })} published closes`,
    columns: ["Branch", "Community", "Close", "Closing rank", "Source"],
    rows: rows.slice(0, MAX_TABLE_ROWS).map((row) => [
      `${row.branchCode} · ${row.branchName}`,
      row.community,
      mark(row.mark),
      rank(row.rank, row.rankSuffix),
      row.sourceRound || row.sourcePage
        ? `R${row.sourceRound ?? "?"} · p${row.sourcePage ?? "?"}`
        : "Archive row",
    ]),
    note:
      rows.length > MAX_TABLE_ROWS
        ? `Showing ${MAX_TABLE_ROWS} of ${rows.length} rows. Narrow by branch or community.`
        : undefined,
  };

  const caveats = [
    parsed.year === 2026
      ? "2026 groups the close by the community the seat was allotted against, not the candidate's own community."
      : "2020–2025 groups the close by the candidate's community.",
  ];
  if (parsed.year < 2025) {
    caveats.push(
      `${parsed.year} closing ranks are not published in this dataset. Only marks are shown; ranks are available for 2025 and 2026.`,
    );
  }
  if (rows.some((row) => row.mark === null || row.rank === null)) {
    caveats.push("Not reported means the official row did not contain a value. It is never filled with zero.");
  }

  const followUps: string[] = [];
  if (parsed.year === 2026) {
    followUps.push(
      `Show the 2026 R1–R3 timeline for ${parsed.college.code}${parsed.branch ? ` ${parsed.branch.code}` : ""} for ${parsed.community ?? "OC"}.`,
    );
  }
  const otherCommunity = COMMUNITIES.find(
    (community) => community !== parsed.community,
  );
  if (parsed.branch && otherCommunity) {
    followUps.push(
      `What was the ${parsed.year} ${otherCommunity} close for ${parsed.college.code} ${parsed.branch.code}?`,
    );
  }
  followUps.push(`Show the 2026 seat matrix for ${parsed.college.code}.`);

  return {
    ...baseResult(parsed),
    title: `${shortName(parsed.college.name, parsed.college.shortName)} · ${parsed.branch?.code ?? "all branches"} · ${parsed.year}`,
    summary: closeSummary(parsed, rows),
    tables: [table],
    citations: citationsForRows(rows, documents),
    caveats,
    followUps,
  };
}

async function answerTimeline(parsed: ParsedQuery): Promise<AssistantResult> {
  if (!parsed.college) return clarify("", parsed);
  if (parsed.year !== 2026) {
    return {
      ...baseResult(parsed),
      title: "Round timelines are a 2026 record",
      summary:
        "The official round-by-round cumulative closes are stored for 2026. Earlier years have a yearly close, not a R1–R3 timeline in this dataset.",
      followUps: [
        `What was the 2026 OC close for ${parsed.college.code}${parsed.branch ? ` ${parsed.branch.code}` : ""}?`,
      ],
      citations: [{ label: "Method", href: "/about#method" }],
    };
  }

  const community = parsed.community ?? "OC";
  const rows = await getTimelineRows({
    collegeCode: parsed.college.code,
    branchCode: parsed.branch?.code,
    community,
    year: 2026,
  });
  const documents = await getDocumentsForIds(rows.map((row) => row.sourceDocumentId));

  if (rows.length === 0) {
    return {
      ...baseResult(parsed),
      title: "No round timeline reported",
      summary: `No 2026 round rows are reported for ${shortName(parsed.college.name, parsed.college.shortName)}${parsed.branch ? ` ${parsed.branch.name}` : ""} for ${community}.`,
      caveats: ["A missing round row is not treated as zero."],
      citations: [{ label: "Data provenance", href: "/about#data" }],
    };
  }

  if (parsed.branch) {
    const table: AssistantTable = {
      title: `2026 cumulative close · ${parsed.branch.code} · ${community}`,
      columns: ["Round", "Cumulative close", "Closing rank", "Last allotment", "Source"],
      rows: rows.map((row) => [
        `After R${row.round}`,
        mark(row.mark),
        rank(row.rank, row.rankSuffix),
        row.sourceRound ? `R${row.sourceRound}` : "Not reported",
        `p${row.sourcePage ?? "?"}`,
      ]),
    };
    const final = rows[rows.length - 1];
    return {
      ...baseResult(parsed),
      title: `${shortName(parsed.college.name, parsed.college.shortName)} · ${parsed.branch.code} · 2026 rounds`,
      summary: `For ${community}, the cumulative close moved from ${mark(rows[0]?.mark)} after Round 1 to ${mark(final.mark)} after Round 3. The R3 cumulative close is the last-ranked allotment across the union of R1–R3.`,
      tables: [table],
      citations: citationsForRows(rows, documents),
      caveats: [
        "Each round is cumulative: Round 2 includes Round 1, and Round 3 includes both earlier rounds.",
        "A later round can only move the closing rank number higher.",
      ],
      followUps: [
        `What was the 2026 ${community} close for ${parsed.college.code} ${parsed.branch.code}?`,
        `Show the 2026 seat matrix for ${parsed.college.code} ${parsed.branch.code}.`,
      ],
    };
  }

  const byBranch = new Map<
    string,
    { name: string; rounds: Map<number, (typeof rows)[number]> }
  >();
  for (const row of rows) {
    const key = `${row.branchCode}:${row.branchName}`;
    const entry = byBranch.get(key) ?? {
      name: `${row.branchCode} · ${row.branchName}`,
      rounds: new Map(),
    };
    entry.rounds.set(row.round, row);
    byBranch.set(key, entry);
  }

  const table: AssistantTable = {
    title: `2026 cumulative close · ${community}`,
    columns: ["Branch", "After R1", "After R2", "After R3", "Source"],
    rows: [...byBranch.values()].slice(0, MAX_TABLE_ROWS).map((entry) => [
      entry.name,
      mark(entry.rounds.get(1)?.mark),
      mark(entry.rounds.get(2)?.mark),
      mark(entry.rounds.get(3)?.mark),
      `p${entry.rounds.get(3)?.sourcePage ?? "?"}`,
    ]),
    note:
      byBranch.size > MAX_TABLE_ROWS
        ? `Showing ${MAX_TABLE_ROWS} of ${byBranch.size} branches. Add a branch code to narrow.`
        : undefined,
  };

  return {
    ...baseResult(parsed),
    title: `${shortName(parsed.college.name, parsed.college.shortName)} · 2026 round timeline · ${community}`,
    summary: `The table shows the cumulative ${community} close after each 2026 round for ${byBranch.size} programmes. Open category is used when no community was named.`,
    tables: [table],
    citations: citationsForRows(rows, documents),
    caveats: [
      "2026 groups by the community the seat was allotted against.",
      "Each round is cumulative; the R3 value must equal the published R3 cumulative close.",
    ],
    followUps: [
      `What was the 2026 ${community} close for ${parsed.college.code}?`,
      `Show the 2026 seat matrix for ${parsed.college.code}.`,
    ],
  };
}

async function answerSeats(parsed: ParsedQuery): Promise<AssistantResult> {
  if (!parsed.college) return clarify("", parsed);

  const rows =
    parsed.year === 2026
      ? await getProgrammeSeatsAndVacancies(parsed.college.code)
      : await getSeatRows({
          collegeCode: parsed.college.code,
          branchCode: parsed.branch?.code,
          year: parsed.year,
        });
  const filtered = parsed.branch
    ? rows.filter((row) => row.branchCode === parsed.branch?.code)
    : rows;

  if (filtered.length === 0) {
    return {
      ...baseResult(parsed),
      title: "No seat row reported",
      summary: `No ${parsed.year} seat-matrix row is reported for ${shortName(parsed.college.name, parsed.college.shortName)}${parsed.branch ? ` ${parsed.branch.name}` : ""}.`,
      caveats: ["A missing seat row is shown as missing, never as zero."],
      citations: [{ label: "Data provenance", href: "/about#data" }],
      followUps: [`Show the 2026 closes for ${parsed.college.code}.`],
    };
  }

  const totalSeats = filtered.reduce((sum, row) => sum + row.totalSeats, 0);
  const vacancyRows = filtered.filter((row) => row.vacant !== null);
  const totalVacant = vacancyRows.reduce(
    (sum, row) => sum + (row.vacant ?? 0),
    0,
  );

  const documents =
    parsed.year === 2026
      ? documentCitations(
          await getSources(),
          /seat matrix|vacanc/i,
        )
      : [];

  const table: AssistantTable = {
    title: `${parsed.year} seat matrix${parsed.year === 2026 ? " and post-Round-3 vacancies" : ""}`,
    columns: [
      "Branch",
      "Seats",
      "Allotted",
      "Vacant",
    ],
    rows: filtered.slice(0, MAX_TABLE_ROWS).map((row) => [
      `${row.branchCode} · ${row.branchName}`,
      formatNumber(row.totalSeats),
      formatNumber(row.allotted),
      formatNumber(row.vacant),
    ]),
    note:
      filtered.length > MAX_TABLE_ROWS
        ? `Showing ${MAX_TABLE_ROWS} of ${filtered.length} branches. Add a branch code to narrow.`
        : undefined,
  };

  return {
    ...baseResult(parsed),
    title: `${shortName(parsed.college.name, parsed.college.shortName)} · ${parsed.year} seats`,
    summary: `${formatNumber(totalSeats)} seats are reported across ${filtered.length} programme${filtered.length === 1 ? "" : "s"}${
      parsed.year === 2026
        ? vacancyRows.length > 0
          ? `, with ${formatNumber(totalVacant)} reported vacancies after Round 3`
          : ", with no post-Round-3 vacancy row reported"
        : ""
    }.`,
    tables: [table],
    citations:
      documents.length > 0
        ? documents
        : [{ label: "Method and data provenance", href: "/about#data" }],
    caveats: [
      "Vacancies are summed across the reported communities. A missing vacancy row is not treated as zero.",
      "Seat totals are the official matrix, not an estimate of available seats in a future round.",
    ],
    followUps: [
      `Show the ${parsed.year} closes for ${parsed.college.code}.`,
      `What was the 2026 OC close for ${parsed.college.code}${parsed.branch ? ` ${parsed.branch.code}` : ""}?`,
    ],
  };
}

async function answerVacancies(parsed: ParsedQuery): Promise<AssistantResult> {
  if (parsed.college) {
    const rows = await getProgrammeSeatsAndVacancies(parsed.college.code);
    const branchCode = parsed.branch?.code;
    const filtered = branchCode
      ? rows.filter((row) => row.branchCode === branchCode)
      : rows;
    const withVacancy = filtered.filter((row) => row.vacant !== null);

    if (withVacancy.length === 0) {
      return {
        ...baseResult(parsed),
        title: "No vacancy row reported",
        summary: `No post-Round-3 vacancy row is reported for ${shortName(parsed.college.name, parsed.college.shortName)}${parsed.branch ? ` ${parsed.branch.name}` : ""}.`,
        caveats: ["Missing vacancies are not zero."],
        citations: [{ label: "Data provenance", href: "/about#data" }],
      };
    }

    const total = withVacancy.reduce((sum, row) => sum + (row.vacant ?? 0), 0);
    const vacancyCitations = documentCitations(
      await getSources(),
      /vacanc/i,
    );
    const table: AssistantTable = {
      title: "2026 vacancies after Round 3",
      columns: ["Branch", "Seats", "Vacant"],
      rows: withVacancy.slice(0, MAX_TABLE_ROWS).map((row) => [
        `${row.branchCode} · ${row.branchName}`,
        formatNumber(row.totalSeats),
        formatNumber(row.vacant),
      ]),
    };

    return {
      ...baseResult(parsed),
      title: `${shortName(parsed.college.name, parsed.college.shortName)} · 2026 vacancies`,
      summary: `${formatNumber(total)} vacancies are reported across ${withVacancy.length} programme${withVacancy.length === 1 ? "" : "s"} after Round 3.`,
      tables: [table],
      citations:
        vacancyCitations.length > 0
          ? vacancyCitations
          : [{ label: "Method and data provenance", href: "/about#data" }],
      caveats: [
        "Vacancies are summed across communities. A missing row is not a zero.",
        "This is a past-round statement, not a promise of a seat in a later round.",
      ],
      followUps: [
        `Show the 2026 seat matrix for ${parsed.college.code}.`,
        `Show the 2026 closes for ${parsed.college.code}.`,
      ],
    };
  }

  const rows = await getVacancyLeaderboard({
    branchCode: parsed.branch?.code,
    district: parsed.district,
    limit: 10,
  });

  if (rows.length === 0) {
    return {
      ...baseResult(parsed),
      title: "No vacancy rows for those filters",
      summary:
        "No post-Round-3 vacancy row matches that branch or district in the dataset.",
      caveats: ["Missing vacancies are not zero."],
      citations: [{ label: "Data provenance", href: "/about#data" }],
    };
  }

  const vacancyCitations = documentCitations(await getSources(), /vacanc/i);

  const table: AssistantTable = {
    title: "Most reported vacancies after Round 3 · 2026",
    columns: ["#", "College", "District", "Vacant"],
    rows: rows.map((row, index) => [
      String(index + 1),
      `${row.collegeCode} · ${row.collegeName}`,
      row.district ?? "Not reported",
      formatNumber(row.vacantSeats),
    ]),
  };

  return {
    ...baseResult(parsed),
    title: `2026 vacancies${parsed.branch ? ` · ${parsed.branch.code}` : ""}${parsed.district ? ` · ${parsed.district}` : ""}`,
    summary: `These are the colleges with the most reported vacant seats after Round 3${parsed.branch ? ` in ${parsed.branch.name}` : ""}${parsed.district ? ` in ${parsed.district} district` : ""}. The count is summed across communities.`,
    tables: [table],
    citations:
      vacancyCitations.length > 0
        ? vacancyCitations
        : [{ label: "Method and data provenance", href: "/about#data" }],
    caveats: [
      "Only colleges with a reported vacancy row appear. A missing row is not zero.",
      "A vacancy after Round 3 does not mean the seat is available now or in a later round.",
    ],
    followUps: [
      `Show 2026 vacancies for ${rows[0].collegeCode}.`,
      "Which colleges had the most vacancies in Computer Science?",
    ],
  };
}

async function answerSources(parsed: ParsedQuery): Promise<AssistantResult> {
  const documents = await getSources();
  const table: AssistantTable = {
    title: "Official source documents",
    columns: ["Year", "Round", "Document", "Pages", "SHA-256"],
    rows: documents.map((document) => [
      String(document.year),
      document.round ? `R${document.round}` : "—",
      document.title,
      String(document.pageCount),
      `${document.sha256.slice(0, 16)}…`,
    ]),
  };

  return {
    ...baseResult(parsed),
    title: "Where the numbers come from",
    summary: `${documents.length} official TNEA documents are recorded with a SHA-256 hash. Each 2026 cutoff row points to a document, round and PDF page.`,
    tables: [table],
    citations: documents.map((document) => ({
      label: `${document.year}${document.round ? ` R${document.round}` : ""} · ${document.title}`,
      detail: `${document.authority} · ${document.pageCount} pages`,
      href: document.url,
    })),
    caveats: [
      "The hash is checked before ingest, so a changed PDF cannot silently replace a published value.",
      "A document merely being listed does not make every number in it part of this dataset.",
    ],
    followUps: [
      "Show the dataset coverage.",
      "What does allotted community mean in 2026?",
    ],
  };
}

async function answerDataset(parsed: ParsedQuery): Promise<AssistantResult> {
  const stats = await getDatasetStats();
  const table: AssistantTable = {
    title: "Dataset coverage",
    columns: ["Measure", "Count"],
    rows: [
      ["Colleges", formatNumber(stats.colleges)],
      ["Branches", formatNumber(stats.branches)],
      ["College–branch programmes", formatNumber(stats.collegeBranches)],
      ["Cutoff rows", formatNumber(stats.cutoffs)],
      ["Closing ranks (2025 & 2026)", formatNumber(stats.generalRanks)],
      ["2026 round-close rows", formatNumber(stats.roundCutoffs)],
      ["2026 vacancy rows", formatNumber(stats.vacancies)],
      ["2026 seat-matrix rows", formatNumber(stats.seats)],
      ["Official source documents", formatNumber(stats.sourceDocuments)],
      ["Districts", formatNumber(stats.districts)],
    ],
  };

  return {
    ...baseResult(parsed),
    title: "What the record covers",
    summary:
      "The public dataset contains published TNEA cutoff marks from 2020–2026, closing ranks for 2025 and 2026, the 2026 seat matrix, post-Round-3 vacancies and the official source documents.",
    tables: [table],
    citations: [{ label: "Method and provenance", href: "/about#data" }],
    caveats: [
      "2026 closes are grouped by allotted community; earlier years use candidate community.",
      "Missing values stay missing and are shown as Not reported.",
    ],
    followUps: [
      "Show the official source documents.",
      "What does allotted community mean?",
    ],
  };
}

async function answerMethod(parsed: ParsedQuery): Promise<AssistantResult> {
  const table: AssistantTable = {
    title: "How a close is defined",
    columns: ["Year", "Community basis", "Closing rank", "Rounds"],
    rows: [
      ["2020–2025", "Candidate's community", "2025 only", "Yearly close"],
      ["2026", "Community the seat was allotted against", "2026", "Cumulative R1–R3"],
    ],
  };

  return {
    ...baseResult(parsed),
    title: "How to read the record",
    summary:
      "For 2020–2025, a cutoff row belongs to the candidate's community as recorded in the archived TNEA export. For 2026, the official tables group the close by the community against which the seat was allotted. The 2026 R3 cumulative close is the last-ranked allotment across the union of Rounds 1–3, with its source round and PDF page.",
    tables: [table],
    citations: [
      { label: "Method", href: "/about#method" },
      { label: "Data provenance", href: "/about#data" },
    ],
    caveats: [
      "A rank and a cutoff mark are compared directly with the same measure. They are never converted into each other.",
      "Closing ranks are stored for 2025 and 2026 only. The archived 2024 rank export duplicates 2025 and is not reused.",
      "A missing mark, rank, seat or vacancy is stored as null and shown as Not reported, never as zero.",
    ],
    followUps: [
      "Show the 2026 timeline for 0001 CS OC.",
      "Show the official source documents.",
    ],
  };
}

async function answerProfile(parsed: ParsedQuery): Promise<AssistantResult> {
  if (!parsed.college) return clarify("", parsed);
  const profile = await getCollegeProfile(parsed.college.code);
  if (!profile) {
    return {
      ...baseResult(parsed),
      title: "College not found",
      summary: `No college with code ${parsed.college.code} is in the dataset.`,
      followUps: ["Search for a college by name."],
    };
  }

  const college = profile.college;
  const overview: AssistantTable = {
    title: "College record",
    columns: ["Field", "Value"],
    rows: [
      ["TNEA code", college.code],
      ["Name", college.name],
      ["District", college.district ?? "Not reported"],
      ["Type", college.type],
      [
        "Autonomous",
        college.autonomous === null
          ? "Not reported"
          : college.autonomous
            ? "Yes"
            : "No",
      ],
      ["Programmes", formatNumber(profile.totals.branches)],
      ["2026 seats", formatNumber(profile.totals.seats2026)],
      ["2026 vacancies after R3", formatNumber(profile.totals.vacancies2026)],
      [
        "Hostel",
        profile.hostel
          ? `Boys: ${profile.hostel.boysAvailable === null ? "Not reported" : profile.hostel.boysAvailable ? "Available" : "No"}; Girls: ${profile.hostel.girlsAvailable === null ? "Not reported" : profile.hostel.girlsAvailable ? "Available" : "No"}`
          : "Not reported",
      ],
      ["Reported fees", formatInr(profile.fees?.tuitionFee ?? null)],
    ],
  };

  const branches: AssistantTable = {
    title: "2026 programmes",
    columns: ["Branch", "Seats", "Vacant", "OC close"],
    rows: profile.branches.slice(0, MAX_TABLE_ROWS).map((branch) => [
      `${branch.branchCode} · ${branch.branchName}`,
      formatNumber(branch.seats2026?.totalSeats),
      formatNumber(branch.vacancies2026),
      mark(branch.cutoffs2026.OC?.mark),
    ]),
    note:
      profile.branches.length > MAX_TABLE_ROWS
        ? `Showing ${MAX_TABLE_ROWS} of ${profile.branches.length} programmes.`
        : undefined,
  };

  return {
    ...baseResult(parsed),
    title: `${shortName(college.name, college.shortName)} (${college.code})`,
    summary: `${shortName(college.name, college.shortName)} is a ${college.type.toLowerCase()} college in ${college.district ?? "a district not reported in the record"} with ${profile.totals.branches} programmes and ${formatNumber(profile.totals.seats2026)} reported 2026 seats.`,
    tables: [overview, branches],
    citations: [{ label: "Method and data provenance", href: "/about#data" }],
    caveats: [
      "Fee and hostel values are shown only when the official record contains them. Otherwise they say Not reported or are omitted.",
      "2026 closes are grouped by allotted community; the branch table shows the Open category.",
    ],
    followUps: [
      `Show the 2026 closes for ${college.code}.`,
      `Show 2026 vacancies after Round 3 for ${college.code}.`,
    ],
  };
}

async function answerCompare(parsed: ParsedQuery): Promise<AssistantResult> {
  if (parsed.colleges.length < 2) {
    return {
      ...baseResult(parsed),
      kind: "clarify",
      title: "Name two colleges",
      summary:
        "Compare needs two four-digit TNEA codes or two distinctive college names, for example: Compare 0001 and 2006 for Computer Science in 2026.",
      followUps: ["Compare 0001 and 2006 for Computer Science in 2026."],
    };
  }

  const [first, second] = parsed.colleges;
  const [a, b] = await Promise.all([
    getCollegeProfile(first.code),
    getCollegeProfile(second.code),
  ]);
  if (!a || !b) return clarify("", parsed);

  const branchFilter = parsed.branch?.code;
  const aBranches = new Map(
    a.branches
      .filter((branch) => !branchFilter || branch.branchCode === branchFilter)
      .map((branch) => [branch.branchCode, branch]),
  );
  const bBranches = new Map(
    b.branches
      .filter((branch) => !branchFilter || branch.branchCode === branchFilter)
      .map((branch) => [branch.branchCode, branch]),
  );

  const normalizeBranchName = (name: string) =>
    name
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const sharedKeys = [...aBranches.keys()].filter((key) => bBranches.has(key));

  type Pair = {
    key: string;
    left?: (typeof a.branches)[number];
    right?: (typeof b.branches)[number];
    matchedByName: boolean;
  };

  let pairs: Pair[] = [];
  if (sharedKeys.length > 0) {
    pairs = sharedKeys.map((key) => ({
      key,
      left: aBranches.get(key),
      right: bBranches.get(key),
      matchedByName: false,
    }));
  } else {
    // Different colleges can use different codes for the same programme. Fall
    // back to the published branch name so the table explains the mismatch
    // instead of reporting every second value as missing.
    const bByName = new Map(
      b.branches.map((branch) => [normalizeBranchName(branch.branchName), branch]),
    );
    const aSource = branchFilter ? a.branches : [...aBranches.values()];
    for (const left of aSource) {
      if (branchFilter && left.branchCode !== branchFilter) continue;
      const right = bByName.get(normalizeBranchName(left.branchName));
      pairs.push({
        key: `${left.branchCode}:${left.branchName}`,
        left,
        right,
        matchedByName: Boolean(right),
      });
    }
    if (pairs.length === 0) {
      pairs = [...a.branches].map((left) => ({
        key: `${left.branchCode}:${left.branchName}`,
        left,
        right: undefined,
        matchedByName: false,
      }));
    }
  }

  const nameMatched = pairs.filter((pair) => pair.matchedByName).length;

  const table: AssistantTable = {
    title: `2026 comparison · ${parsed.branch?.code ?? "shared programmes"}`,
    columns: [
      "Branch",
      `${first.code} OC close`,
      `${second.code} OC close`,
      `${first.code} seats`,
      `${second.code} seats`,
    ],
    rows: pairs.slice(0, MAX_TABLE_ROWS).map((pair) => {
      const left = pair.left;
      const right = pair.right;
      return [
        left
          ? `${left.branchCode} · ${left.branchName}`
          : right
            ? `${right.branchCode} · ${right.branchName}`
            : pair.key,
        mark(left?.cutoffs2026.OC?.mark),
        mark(right?.cutoffs2026.OC?.mark),
        formatNumber(left?.seats2026?.totalSeats),
        formatNumber(right?.seats2026?.totalSeats),
      ];
    }),
    note:
      sharedKeys.length === 0
        ? nameMatched > 0
          ? `No shared programme code was found. ${nameMatched} programme${nameMatched === 1 ? "" : "s"} matched by published name; check the code column before comparing.`
          : "No shared programme code or name was found. The table lists the first college's programmes with Not reported for the second."
        : undefined,
  };

  return {
    ...baseResult(parsed),
    title: `${first.code} vs ${second.code}`,
    summary: `The table compares the 2026 Open-category close and seat count for ${
      sharedKeys.length > 0
        ? `${sharedKeys.length} shared programme${sharedKeys.length === 1 ? "" : "s"}`
        : nameMatched > 0
          ? `${nameMatched} programme${nameMatched === 1 ? "" : "s"} matched by name because the colleges use different branch codes`
          : "the first college's programmes"
    }. ${a.college.code} has ${formatNumber(a.totals.seats2026)} reported seats; ${b.college.code} has ${formatNumber(b.totals.seats2026)}.`,
    tables: [table],
    citations: [{ label: "Method and data provenance", href: "/about#data" }],
    caveats: [
      "Only the Open category is shown in this comparison.",
      "A branch code is a college's own catalogue code. Different codes do not always mean different programmes, so name matches are labelled.",
      "No teaching quality, placement or fee judgement is implied. The comparison is limited to the published record.",
    ],
    followUps: [
      `Show the 2026 closes for ${first.code} ${branchFilter ?? "CS"} for BC.`,
      `Show the 2026 timeline for ${second.code} ${branchFilter ?? "CS"} for OC.`,
    ],
  };
}

function refusalForQuestion(question: string, usedModel: boolean) {
  const reason = unsupportedReason(question);
  return reason ? refusal(reason, usedModel) : null;
}

/**
 * The single public entry point. Refusals are decided before any model call;
 * model use is limited to mapping an ambiguous question onto a fixed intent.
 */
export async function answerQuestion(question: string): Promise<AssistantResult> {
  const trimmed = question.trim();
  const earlyRefusal = refusalForQuestion(trimmed, false);
  if (earlyRefusal) return earlyRefusal;

  const parsed = await parseQuestion(trimmed);
  if (parsed.intent === "clarify") {
    const modelRefusal = refusalForQuestion(trimmed, parsed.usedModel);
    if (modelRefusal) return modelRefusal;
    return clarify(trimmed, parsed);
  }

  if (
    !parsed.college &&
    ["closes", "timeline", "seats", "profile"].includes(parsed.intent)
  ) {
    return clarify(trimmed, parsed);
  }

  switch (parsed.intent) {
    case "closes":
      return answerCloses(parsed);
    case "timeline":
      return answerTimeline(parsed);
    case "seats":
      return answerSeats(parsed);
    case "vacancies":
      return answerVacancies(parsed);
    case "sources":
      return answerSources(parsed);
    case "dataset":
      return answerDataset(parsed);
    case "method":
      return answerMethod(parsed);
    case "profile":
      return answerProfile(parsed);
    case "compare":
      return answerCompare(parsed);
    default:
      return clarify(trimmed, parsed);
  }
}

/**
 * Versioned, plain-language admission pathway content.
 *
 * This is deliberately a map, not a rulebook. It is revised as one file so the
 * Git history is the version history. Every pathway points to the authority
 * that publishes the actual rule; the app never restates a fee, date or seat
 * count that is not in the official record.
 */
export const PATHWAY_VERSION = {
  version: "2026.1",
  effectiveYear: 2026,
  reviewedOn: "2026-11-08",
  authority: "Directorate of Technical Education, Tamil Nadu",
  primarySource: "https://www.tneaonline.org/",
  departmentSource: "https://www.dte.tn.gov.in/",
} as const;

export type Pathway = {
  id: string;
  title: string;
  tag: string;
  summary: string;
  who: string;
  steps: string[];
  caution: string;
};

export const PATHWAYS: Pathway[] = [
  {
    id: "government-quota",
    title: "Government quota through TNEA single-window counselling",
    tag: "First-year B.E. / B.Tech",
    summary:
      "The main first-year engineering route. Seats in government, government-aided and participating self-financing colleges are offered through the state single-window counselling, using the published cutoff and rank.",
    who: "Students who completed Class 12 (academic or vocational stream as notified) and meet the current TNEA eligibility rules.",
    steps: [
      "Read the current TNEA information bulletin and eligibility rules on tneaonline.org.",
      "Complete the online application and pay the published fee inside the official window.",
      "Check the published rank and the certificate verification schedule.",
      "Fill choices in the order you actually want them; the choice order is yours, not the tool's.",
      "Respond to each round's official allotment within the stated time.",
    ],
    caution:
      "Only the official TNEA portal can accept an application or allot a seat. A position reading on this site is not an application.",
  },
  {
    id: "management-quota",
    title: "Management quota in a self-financing college",
    tag: "College-level admission",
    summary:
      "Self-financing colleges may fill a defined share of seats directly under the rules set by the state. The college, not TNEA single-window counselling, handles this route.",
    who: "Students who meet the eligibility notified for the college and the management-quota category.",
    steps: [
      "Confirm with the college that it participates and how many management-quota seats the current rules allow.",
      "Ask for the written fee structure and the exact eligibility and document list.",
      "Verify the college's approval and programme accreditation on the official DTE / AICTE record.",
      "Do not pay any amount before reading the current government fee and admission notification.",
    ],
    caution:
      "Availability, fees and eligibility change. This site does not list management-quota seats or fees because that would require a current official college-level record.",
  },
  {
    id: "lateral-entry",
    title: "Lateral entry into the second year",
    tag: "Diploma / degree holders",
    summary:
      "A separate route for eligible diploma holders and degree holders into the second year of a B.E. / B.Tech programme. It is not the first-year TNEA single-window process.",
    who: "Candidates who hold a recognised diploma or degree and satisfy the current lateral-entry notification.",
    steps: [
      "Wait for the separate lateral-entry notification from the Directorate of Technical Education.",
      "Check the eligible diploma/degree programmes and the prescribed bridge requirements.",
      "Apply through the portal named in that notification, not the first-year TNEA form.",
      "Keep the diploma/degree marksheets and transfer certificate ready for verification.",
    ],
    caution:
      "Do not use first-year cutoff tables to judge a lateral-entry seat. The seat pool and the eligibility rules are different.",
  },
  {
    id: "special-categories",
    title: "Special categories and separate lists",
    tag: "Read the current notification",
    summary:
      "TNEA publishes separate provisions for categories such as vocational stream, sports, differently abled candidates, ex-servicemen and other notified groups. Some have separate seat pools or eligibility conditions.",
    who: "Candidates who believe they qualify for a notified special category.",
    steps: [
      "Find the exact category in the current TNEA information bulletin.",
      "Check the prescribed certificate, issuing authority and validity period.",
      "Follow the separate application or verification step named in the bulletin.",
      "Keep the original certificate ready for the official verification.",
    ],
    caution:
      "A category name alone is not eligibility. The current official notification decides who qualifies and what evidence is required.",
  },
];

export const BEFORE_YOU_ACT = [
  "Use the official TNEA portal for every application, fee and allotment.",
  "Read the current year's information bulletin; old rules may not apply.",
  "Keep original certificates and the exact names/spellings consistent.",
  "Treat any cutoff, rank or fee not visible in an official document as unknown.",
  "Never share an OTP, password or payment PIN with a college agent.",
];

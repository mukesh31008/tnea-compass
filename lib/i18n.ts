import { type Community } from "@/lib/tnea";

export type Locale = "en" | "ta";

export const TRANSLATIONS_TA = {
  // Navigation & Core Actions
  nav: {
    home: "முகப்பு",
    ask: "கேள்வி கேளுங்கள்",
    colleges: "கல்லூரிகள்",
    cutoffs: "கட்-ஆஃப் விவரங்கள்",
    predictor: "தரவரிசை நிலை",
    compare: "ஒப்பீடு",
    choices: "விருப்பப் பட்டியல்",
    simulator: "கலந்தாய்வு மாதிரி",
    resources: "வளங்கள் & உதவி",
  },
  // Communities
  communities: {
    OC: "பொதுப் பிரிவு (OC)",
    BC: "பிற்படுத்தப்பட்டோர் (BC)",
    BCM: "பிற்படுத்தப்பட்ட முஸ்லிம் (BCM)",
    MBC: "மிகவும் பிற்படுத்தப்பட்டோர் (MBC/DNC)",
    SC: "ஆதி திராவிடர் (SC)",
    SCA: "அருந்ததியர் (SCA)",
    ST: "பழங்குடியினர் (ST)",
  } as Record<Community, string>,
  // College Types
  collegeTypes: {
    Government: "அரசு கல்லூரி",
    "Government Aided": "அரசு உதவிபெறும் கல்லூரி",
    "Self-Financing": "சுயநிதி கல்லூரி",
    "University Department": "பல்கலைக்கழகத் துறை",
  } as Record<string, string>,
  // Predictor Bands
  bands: {
    comfortable: "மிகவும் பாதுகாப்பானது (Well inside)",
    likely: "கிடைக்கக்கூடிய வாய்ப்பு (Inside)",
    borderline: "எல்லைக்கோடு (Near close)",
    stretch: "வெளியே (Outside)",
    unlikely: "மிகக் கடினம் (Well outside)",
  },
  // Key Terminology
  terms: {
    rank: "பொதுத் தரவரிசை",
    cutoff: "கட்-ஆஃப் மதிப்பெண்",
    seats: "மொத்த இடங்கள்",
    district: "மாவட்டம்",
    branch: "பாடப்பிரிவு",
    round: "சுற்று",
    allotment: "இட ஒதுக்கீடு",
    upwardMovement: "மேல்நோக்கிய நகர்வு (Upward Movement)",
    choiceFilling: "விருப்பங்களை வரிசைப்படுத்துதல்",
    safe: "பாதுகாப்பானது",
    target: "இலக்கு",
    dream: "கனவு",
  },
};

export function getCommunityLabel(community: Community, locale: Locale = "en"): string {
  if (locale === "ta" && TRANSLATIONS_TA.communities[community]) {
    return TRANSLATIONS_TA.communities[community];
  }
  return community;
}

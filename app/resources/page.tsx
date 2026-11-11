"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calculator,
  CheckSquare,
  Clock,
  GraduationCap,
  Sparkles,
  Info,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const TIMELINE_STAGES = [
  {
    step: "01",
    title: "Registration & Application Submission",
    timeline: "May – June",
    desc: "Complete online profile on tneaonline.org. Enter user details, board roll number, and pay registration fees.",
  },
  {
    step: "02",
    title: "Random Number Generation",
    timeline: "Early June",
    desc: "A unique 10-digit random number is assigned to each applicant for tie-breaking when cutoffs match.",
  },
  {
    step: "03",
    title: "Certificate Verification at TFCs",
    timeline: "June",
    desc: "Online or physical verification at designated TNEA Facilitation Centres for nativity, community, and marks.",
  },
  {
    step: "04",
    title: "Overall Rank List Publication",
    timeline: "Late June",
    desc: "Official General Rank and Community Ranks published. Students can file grievances for discrepancy redressal.",
  },
  {
    step: "05",
    title: "Choice Filling & Locking (Rounds 1–3)",
    timeline: "July – August",
    desc: "3 days per round for choice entry, re-ordering, and locking. Unlocked lists are automatically locked at the deadline.",
  },
  {
    step: "06",
    title: "Provisional Allotment & Upward Movement",
    timeline: "August",
    desc: "Accept allotment or opt for upward movement. Report to allotted institutions within the designated reporting window.",
  },
];

const MANDATORY_DOCUMENTS = [
  { id: "doc-1", title: "10th Standard Mark Sheet", desc: "Proof of date of birth and core subject marks." },
  { id: "doc-2", title: "+2 (HSC) Mark Sheet / Hall Ticket", desc: "Statement of marks in Maths, Physics, Chemistry." },
  { id: "doc-3", title: "Transfer Certificate (TC)", desc: "Issued by the school last attended." },
  { id: "doc-4", title: "Permanent Community Certificate", desc: "With digital hologram/QR code for BC, BCM, MBC, SC, SCA, ST." },
  { id: "doc-5", title: "Nativity Certificate (if applicable)", desc: "Mandatory if +1/+2 was studied outside Tamil Nadu." },
  { id: "doc-6", title: "7.5% Govt School Bonafide Certificate", desc: "Headmaster/DEO attested certificate for students studying in TN Govt schools from 6th to 12th." },
  { id: "doc-7", title: "First Graduate Certificate & Declaration", desc: "Issued by Revenue Department if claiming the ₹25,000 tuition fee waiver." },
  { id: "doc-8", title: "Income Certificate (for SC/SCA/ST/PMSS)", desc: "Required for complete tuition fee reimbursement under scholarship schemes." },
];

export default function ResourcesPage() {
  // Cutoff Calculator state
  const [maths, setMaths] = React.useState("95");
  const [physics, setPhysics] = React.useState("90");
  const [chemistry, setChemistry] = React.useState("92");
  const [checkedDocs, setCheckedDocs] = React.useState<Record<string, boolean>>({});

  // Calculate cutoff: Maths + Physics/2 + Chemistry/2
  const m = parseFloat(maths) || 0;
  const p = parseFloat(physics) || 0;
  const c = parseFloat(chemistry) || 0;
  const calculatedCutoff = Math.min(200, Math.max(0, m + p / 2 + c / 2));

  function toggleDoc(id: string) {
    setCheckedDocs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Student Toolkit"
        title="TNEA Preparation Hub & Resources"
        description="Calculate your official aggregate engineering cutoff, track required admission documents, and understand the step-by-step counselling timeline."
        actions={
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <GraduationCap className="size-3.5 text-primary" />
            Standard Anna University Formula
          </Badge>
        }
      />

      <div className="container-page py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr]">
          {/* Left Column: Cutoff Calculator */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Calculator className="size-5 text-primary" />
                <h2 className="text-base font-semibold">TNEA Cutoff Calculator</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tamil Nadu Engineering Admissions calculates cutoffs out of 200 marks:
                <br />
                <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  Cutoff = Maths + (Physics / 2) + (Chemistry / 2)
                </code>
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="maths-input" className="text-xs">
                    Mathematics (Out of 100)
                  </Label>
                  <Input
                    id="maths-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={maths}
                    onChange={(e) => setMaths(e.target.value)}
                    placeholder="100"
                    className="mt-1 font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="physics-input" className="text-xs">
                    Physics (Out of 100)
                  </Label>
                  <Input
                    id="physics-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={physics}
                    onChange={(e) => setPhysics(e.target.value)}
                    placeholder="100"
                    className="mt-1 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Contributes {p > 0 ? (p / 2).toFixed(2) : "0"} to cutoff
                  </span>
                </div>

                <div>
                  <Label htmlFor="chemistry-input" className="text-xs">
                    Chemistry (Out of 100)
                  </Label>
                  <Input
                    id="chemistry-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={chemistry}
                    onChange={(e) => setChemistry(e.target.value)}
                    placeholder="100"
                    className="mt-1 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Contributes {c > 0 ? (c / 2).toFixed(2) : "0"} to cutoff
                  </span>
                </div>

                {/* Result Card */}
                <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Aggregate TNEA Cutoff
                  </div>
                  <div className="mt-1 font-mono text-4xl font-extrabold text-primary">
                    {calculatedCutoff.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground"> / 200</span>
                  </div>

                  <div className="mt-4">
                    <Button asChild size="sm" className="w-full font-semibold">
                      <Link href={`/predictor?mode=cutoff&val=${calculatedCutoff.toFixed(2)}`}>
                        <Sparkles className="mr-2 size-3.5" />
                        Check Position for {calculatedCutoff.toFixed(2)}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Official Support & Help */}
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Official Helpline & Portals</h3>
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>
                  Official TNEA Portal:{" "}
                  <a
                    href="https://www.tneaonline.org"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline hover:text-primary"
                  >
                    tneaonline.org
                  </a>
                </p>
                <p>
                  Directorate of Technical Education (DoTE): Guindy, Chennai – 600 025.
                </p>
                <p>
                  TNEA Enquiry Phone: 044-22351014 / 044-22351015
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column: Timeline & Checklist */}
          <div className="space-y-6">
            {/* Timeline */}
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <h3 className="text-base font-semibold">TNEA Counselling Timeline & Stages</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The general counselling cycle spans 6 distinct phases. Familiarize yourself with each milestone.
              </p>

              <div className="mt-6 space-y-4">
                {TIMELINE_STAGES.map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-4 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                      {item.step}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-foreground text-xs sm:text-sm">
                          {item.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.timeline}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Document Checklist */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-5 text-primary" />
                  <h3 className="text-base font-semibold">Mandatory Documents Checklist</h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {Object.values(checkedDocs).filter(Boolean).length} of {MANDATORY_DOCUMENTS.length} ready
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ensure original copies and 2 sets of attested photocopies are organized before certificate verification.
              </p>

              <div className="mt-5 space-y-3">
                {MANDATORY_DOCUMENTS.map((doc) => {
                  const isChecked = Boolean(checkedDocs[doc.id]);
                  return (
                    <label
                      key={doc.id}
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer select-none transition-colors hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleDoc(doc.id)}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5 text-xs">
                        <div
                          className={`font-semibold ${
                            isChecked ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {doc.title}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {doc.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

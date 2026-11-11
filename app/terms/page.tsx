import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scale, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service, disclaimers, and acceptable use guidelines for TNEA Compass.",
};

export default function TermsPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Scale className="size-3.5" />
            Terms of Service & Usage Guidelines
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: November 2026 · Version 1.1
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <Card className="border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  Important Official Disclaimers
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  TNEA Compass is an <strong>independent, open analytical tool</strong> created to assist students
                  in evaluating historic admission cutoffs. TNEA Compass is <strong>not affiliated with, endorsed by,
                  or connected to</strong> the Directorate of Technical Education (DoTE) Tamil Nadu, Anna University,
                  or any statutory counselling authority.
                </p>
              </div>
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              1. Informational & Illustrative Nature of Predictions
            </h2>
            <p>
              All rank-distance calculations, closing cutoff tables, position estimates, and simulated allotments
              provided across this website are derived mathematically from publicly released 2020–2026 TNEA
              seat allotment documents.
            </p>
            <p>
              Actual college cutoffs fluctuate each academic year depending on applicant counts, seat intake variations,
              board examination grade distributions, and student preference trends. Nothing on this website
              constitutes a promise, guarantee, or contractual assurance of engineering admission or allotment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              2. Student Duty of Independent Verification
            </h2>
            <p>
              You acknowledge and agree that your final, binding choice filling and registration MUST be completed
              strictly on the official government portal:
            </p>
            <div className="rounded-lg border border-border bg-card p-4">
              <a
                href="https://www.tneaonline.org"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-primary underline underline-offset-4"
              >
                https://www.tneaonline.org <ExternalLink className="size-3.5" />
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                Always verify college codes, autonomous statuses, branch titles, and allotment notifications
                against the official TNEA guidelines before the choice locking deadline.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              3. User Accounts and Content
            </h2>
            <p>
              When registering an account or entering information into the Academic Tracker:
            </p>
            <ul className="list-disc space-y-1.5 pl-6 text-muted-foreground">
              <li>You agree to provide true, accurate, and personal information for your own counselling use.</li>
              <li>You may not use automated bots or scrapers that place unreasonable strain on the platform or degrade service for other students.</li>
              <li>You retain full ownership of any notes or choice configurations you create.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              4. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable Indian law, TNEA Compass and its maintainers shall not be liable
              for any direct, indirect, incidental, consequential, or special damages arising out of or in connection with
              your use of or inability to use this platform, including any choice filling decisions, missed deadlines,
              or seat outcomes during official counselling rounds.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              5. Contact & Corrections
            </h2>
            <p>
              If you detect any typographical mismatch or discrepancy in official college codes or historic closing ranks,
              please submit a public correction via our GitHub issue tracker. We strive to maintain absolute provenance
              and data integrity.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

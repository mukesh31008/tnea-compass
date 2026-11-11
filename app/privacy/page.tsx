import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Download, Trash2, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy · DPDP Compliance",
  description:
    "How TNEA Compass collects, uses, and protects student data under India's Digital Personal Data Protection (DPDP) Act 2023.",
};

export default function PrivacyPage() {
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
            <ShieldCheck className="size-3.5" />
            Digital Personal Data Protection (DPDP) Act 2023 Compliant
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy & Data Rights
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: November 2026 · Version 1.2
          </p>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              1. Our Core Privacy Principle: Separation of Records
            </h2>
            <p>
              TNEA Compass was engineered from day one with data minimization in mind.
              The college cutoffs, seat matrices, and branch statistics displayed on this site
              are 100% public administrative data published by the Directorate of Technical
              Education (DoTE), Tamil Nadu.
            </p>
            <p>
              Browsing public cutoffs, comparing colleges, using the predictor, and building a
              choice list requires <strong>no account and no submission of personal data</strong>.
              Your choice list is stored inside your browser&apos;s local storage (LocalStorage) and
              never touches our servers unless you explicitly sign in and choose to sync it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              2. What Data We Collect When You Create an Account
            </h2>
            <p>
              If you optionally create an account to use the Private Academic Tracker or Cloud Choice Sync,
              we collect only what is strictly necessary:
            </p>
            <ul className="list-disc space-y-1.5 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">Identity Data:</strong> Email address and your chosen display name.
              </li>
              <li>
                <strong className="text-foreground">Optional Academic Profile:</strong> Class 12 board marks (Maths, Physics, Chemistry),
                community reservation category (OC, BC, BCM, MBC/DNC, SC, SCA, ST), home district, and school type (Government/Private/Aided).
              </li>
              <li>
                <strong className="text-foreground">Application Tracker Data:</strong> Application deadlines and notes you manually enter into your private dashboard.
              </li>
            </ul>
          </section>

          <Card className="border-primary/20 bg-primary/5 p-5">
            <h3 className="font-semibold text-foreground">
              Your Rights Under the DPDP Act 2023
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              As a Data Principal under Indian law, you have absolute authority over your personal information:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Download className="size-3.5 text-primary" />
                  Right to Access & Data Portability
                </div>
                <p className="mt-1 text-muted-foreground">
                  Download a machine-readable JSON copy of every row we hold about you with one click via our account dashboard.
                </p>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 font-semibold text-destructive">
                  <Trash2 className="size-3.5" />
                  Right to Erasure & Deletion
                </div>
                <p className="mt-1 text-muted-foreground">
                  Trigger an instantaneous, permanent deletion of your profile, marks, and sessions in Profile &gt; Danger Zone.
                </p>
              </div>
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              3. Data Retention and Third-Party Processors
            </h2>
            <p>
              We do not sell, rent, monetize, or broker student records to commercial coaching centers,
              agents, or private colleges. We employ only vetted, enterprise-grade cloud infrastructure:
            </p>
            <ul className="list-disc space-y-1.5 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">Vercel:</strong> Application hosting, edge compute, and CDN with TLS 1.3 encryption.
              </li>
              <li>
                <strong className="text-foreground">Turso (libSQL):</strong> Encrypted database cluster hosting relational data with zero public table access.
              </li>
              <li>
                <strong className="text-foreground">Resend:</strong> Secure transactional email delivery for magic links and password verification.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              4. Cookies and Local Storage
            </h2>
            <p>
              We use <strong>functional cookies</strong> strictly for secure session tokens (via Better Auth)
              and CSRF prevention. We do not use third-party behavioral advertising cookies or cross-site tracking trackers.
              Your choice list persists offline in your browser via standard HTML5 LocalStorage.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              5. Grievance Redressal and Data Officer Contact
            </h2>
            <p>
              If you have any questions regarding your personal data, desire to revoke consent,
              or encounter any difficulty exercising your statutory rights:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-xs">
              <Mail className="size-4 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Data Protection Grievance Officer</p>
                <p className="text-muted-foreground">Email: privacy@tneacompass.in · Response SLA: Under 72 hours</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  Compass,
  Database,
  GitCompareArrows,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import {
  getBranchOptions,
  getDatasetStats,
  getDistrictOptions,
} from "@/lib/db/queries";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/colleges",
    icon: Building2,
    title: "College explorer",
    description:
      "Filter 450 institutions by district, branch, accreditation, hostel and more.",
  },
  {
    href: "/cutoffs",
    icon: BarChart3,
    title: "Cutoff trends",
    description:
      "See how closing marks moved across six years, every branch and community.",
  },
  {
    href: "/predictor",
    icon: Sparkles,
    title: "Where you stand",
    description:
      "Compare your rank or cutoff with published closing values and see the distance.",
  },
  {
    href: "/predictor?mode=cutoff",
    icon: Calculator,
    title: "Cutoff check",
    description:
      "Compare your cutoff mark with published 2025 closing marks by branch and community.",
  },
  {
    href: "/compare",
    icon: GitCompareArrows,
    title: "Compare colleges",
    description:
      "Put up to four colleges side by side — cutoffs, seats, fees and facilities.",
  },
  {
    href: "/choices",
    icon: ListChecks,
    title: "Choice list",
    description:
      "Build, reorder and export a counselling list with duplicate checks.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Tell us where you stand",
    body: "Enter your cutoff or rank and your community. No account, no personal details.",
  },
  {
    n: "02",
    title: "Read the evidence",
    body: "Every result shows the 2025 closing rank and earlier cutoff marks it was compared against.",
  },
  {
    n: "03",
    title: "Build your list",
    body: "Save colleges, order your choices, and export a clean PDF or CSV.",
  },
];

export default async function HomePage() {
  const [stats, districts, branches] = await Promise.all([
    getDatasetStats(),
    getDistrictOptions().catch(() => []),
    getBranchOptions().catch(() => []),
  ]);

  const statCards = [
    {
      value: formatNumber(stats.colleges),
      label: "Colleges",
      hint: `Across ${stats.districts || "Tamil Nadu"} districts`,
    },
    {
      value: formatNumber(stats.cutoffs),
      label: "Cutoff marks",
      hint: "2020 – 2025",
    },
    {
      value: formatNumber(stats.branches),
      label: "Branches",
      hint: `${formatNumber(stats.collegeBranches)} programmes`,
    },
    {
      value: formatNumber(stats.seats),
      label: "Seat rows",
      hint: "Allotment history",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 fine-grid opacity-60 [mask-image:linear-gradient(to_bottom,black_10%,transparent_85%)]" />
        <div className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
        <div className="container-page relative grid gap-12 py-16 md:py-24 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-xs">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                TNEA 2026 · Independent, data-first
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="display mt-6 text-[2.75rem] leading-[1.02] text-foreground sm:text-[3.6rem] lg:text-[4rem]">
                Find the college that{" "}
                <span className="italic text-primary">fits</span> your rank.
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                Search Tamil Nadu&apos;s engineering colleges, read six years of
                real cutoffs, and build a choice list you can defend — without
                guessing.
              </p>
            </Reveal>

            <Reveal delay={180}>
              <form
                action="/colleges"
                method="get"
                className="mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-sm transition-shadow focus-within:shadow-md"
              >
                <Search className="ml-2.5 size-4 shrink-0 text-muted-foreground" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search a college, code, or district…"
                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                  aria-label="Search colleges"
                />
                <Button type="submit" size="sm" className="shrink-0 gap-1.5">
                  Search
                  <ArrowRight className="size-3.5" />
                </Button>
              </form>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
                <span className="text-muted-foreground/60">Try</span>
                <Link href="/colleges?branch=CS&district=Chennai" className="hover:text-primary">
                  CSE in Chennai
                </Link>
                <Link href="/colleges?type=Government" className="hover:text-primary">
                  Government colleges
                </Link>
                <Link href="/colleges?hostel=1" className="hover:text-primary">
                  Hostel available
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={160} className="lg:justify-self-end">
            <Card className="w-full max-w-md overflow-hidden p-0 shadow-md">
              <div className="flex items-center justify-between border-b border-border bg-surface/70 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Compass className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Read your position</p>
                    <p className="text-[11px] text-muted-foreground">
                      Based on 2025 closing ranks
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="gap-1">
                  <span className="size-1.5 rounded-full bg-success" />
                  Free
                </Badge>
              </div>

              <form action="/predictor" method="get" className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="home-rank"
                    className="text-[12px] font-medium text-foreground"
                  >
                    Your TNEA general rank
                  </label>
                  <input
                    id="home-rank"
                    name="rank"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="e.g. 12500"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-lg tracking-tight shadow-xs outline-none transition-colors focus:border-ring/50 focus:ring-2 focus:ring-ring/15"
                  />
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="home-community"
                      className="text-[12px] font-medium text-foreground"
                    >
                      Community
                    </label>
                    <select
                      id="home-community"
                      name="community"
                      defaultValue="OC"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring/50 focus:ring-2 focus:ring-ring/15"
                    >
                      {["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="home-cutoff"
                      className="text-[12px] font-medium text-foreground"
                    >
                      or cutoff
                    </label>
                    <input
                      id="home-cutoff"
                      name="cutoff"
                      type="number"
                      step="0.5"
                      min={0}
                      max={200}
                      placeholder="190.5"
                      className="h-10 w-24 rounded-lg border border-input bg-background px-3 font-mono text-sm shadow-xs outline-none transition-colors focus:border-ring/50 focus:ring-2 focus:ring-ring/15"
                    />
                  </div>
                </div>

                <Button type="submit" className="h-11 w-full gap-2">
                  Compare with 2025 closes
                  <ArrowRight className="size-4" />
                </Button>

                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  No sign-up. Inputs are used only for this comparison.
                </p>
              </form>
            </Card>
          </Reveal>
        </div>

        <div className="container-page relative pb-10">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="bg-card px-5 py-4">
                <p className="font-mono text-xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-foreground/80">
                  {stat.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <SectionHeading
          eyebrow="The toolkit"
          title="Everything you need, in one place"
          description="Six focused tools that follow the actual TNEA counselling workflow — from first shortlist to final choice order."
          actions={
            <Link href="/colleges">
              <Button variant="outline" size="sm" className="gap-1.5">
                Browse colleges
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool, index) => (
            <Reveal key={tool.href} delay={index * 50}>
              <Link href={tool.href} className="group block h-full">
                <Card className="card-hover flex h-full flex-col p-5 hover:border-primary/25">
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-lg border border-border bg-surface text-primary">
                      <tool.icon className="size-[18px]" />
                    </span>
                    <ArrowRight className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                    {tool.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {districts.length > 0 && branches.length > 0 && (
        <section className="container-page py-16 md:py-20">
          <SectionHeading
            eyebrow="Browse"
            title="Start where you are"
            description="Jump into the same 450-college record by district or branch. No account needed."
            actions={
              <Link href="/colleges">
                <Button variant="outline" size="sm" className="gap-1.5">
                  All colleges
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            }
          />

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  By district
                </h3>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {stats.districts} districts
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
                {districts.slice(0, 8).map((item) => (
                  <Link
                    key={item.district}
                    href={`/colleges?district=${encodeURIComponent(item.district)}`}
                    className="group flex items-center justify-between gap-2 bg-card px-4 py-3 transition-colors hover:bg-accent/60"
                  >
                    <span className="truncate text-[13px] font-medium transition-colors group-hover:text-primary">
                      {item.district}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.colleges}
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Counts show colleges with at least one branch record.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  By branch
                </h3>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {branches.length} offered
                </span>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {branches.slice(0, 10).map((item) => (
                  <li key={item.code}>
                    <Link
                      href={`/colleges?branch=${encodeURIComponent(item.code)}`}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/40"
                    >
                      <span className="grid h-6 min-w-7 place-items-center rounded border border-border bg-surface px-1 font-mono text-[10px] font-semibold text-muted-foreground">
                        {item.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium transition-colors group-hover:text-primary">
                        {item.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {item.colleges}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-border bg-surface/50">
        <div className="container-page py-16 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <SectionHeading
                eyebrow="How it works"
                title="A shortlist you can actually explain"
                description="No black box. Every recommendation is backed by the closing ranks it was compared against."
                className="mb-0"
              />
              <div className="mt-8 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <ShieldCheck className="size-5 shrink-0 text-primary" />
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  We never invent cutoff numbers. Missing data is labelled{" "}
                  <span className="font-medium text-foreground">Not reported</span>.
                </p>
              </div>
            </div>

            <div className="space-y-0">
              {STEPS.map((step, index) => (
                <Reveal key={step.n} delay={index * 70}>
                  <div className="flex gap-5 border-b border-border py-6 first:pt-0 last:border-b-0">
                    <span className="font-mono text-[12px] font-semibold text-primary">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold">{step.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Database className="size-3.5 text-primary" />
              Data provenance
            </div>
            <h2 className="display mt-5 text-3xl leading-tight sm:text-[2.5rem]">
              Built on the published TNEA record, not opinions.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Cutoff marks from 2020 to 2025, 2025 closing ranks, and seat
              allotment records are compiled from published TNEA counselling
              data. We keep the year attached to every number so you can audit
              it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Cutoff marks",
                "2025 closing ranks",
                "Seat matrix",
                "Hostel data",
                "Branch codes",
              ].map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1 px-2.5 py-1">
                    <CheckCircle2 className="size-3 text-primary" />
                    {item}
                  </Badge>
                )
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">What the data covers</p>
                  <p className="text-[11px] text-muted-foreground">
                    2020 – 2025 counselling years
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-success/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                Verified
              </span>
            </div>
            <dl className="mt-4 divide-y divide-border">
              {[
                ["Colleges", formatNumber(stats.colleges)],
                ["College–branch programmes", formatNumber(stats.collegeBranches)],
                ["Cutoff marks (2020–2025)", formatNumber(stats.cutoffs)],
                ["Closing ranks (2025)", formatNumber(stats.generalRanks)],
                ["Seat allotment rows", formatNumber(stats.seats)],
                ["Communities covered", "7"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <dt className="text-[13px] text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-[13px] font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/about#data"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
            >
              Read the methodology
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-ink px-6 py-12 text-background sm:px-10 md:py-16">
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] fine-grid" />
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/30 blur-[90px]" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Start with your rank
              </p>
              <h2 className="display mt-3 text-3xl leading-tight text-background sm:text-4xl">
                Your counselling list can be ready in ten minutes.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-background/65">
                No sign-up required. Save your list locally, or create an account
                to sync it across devices.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/predictor">
                <Button size="lg" className="w-full gap-2 bg-background text-foreground hover:bg-background/90 sm:w-auto">
                  <Sparkles className="size-4" />
                  See where I stand
                </Button>
              </Link>
              <Link href="/colleges">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-background/20 bg-transparent text-background hover:bg-background/10 hover:text-background sm:w-auto"
                >
                  Explore colleges
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
